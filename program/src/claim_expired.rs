use solana_program::{
    account_info::AccountInfo,
    clock::Clock,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    sysvar::Sysvar,
};
use steel::*;
use bountyboard_api::{
    consts::*,
    error::BountyBoardError,
    instruction::ClaimExpiredArgs,
    state::{Config, Task},
};

/// Process ClaimExpired instruction
///
/// Permissionless auto-release: if a task has been in SUBMITTED status for more
/// than AUTO_RELEASE_TIMEOUT (48h), anyone can call this to release escrow to
/// the worker. This prevents creators from ghosting workers.
///
/// Accounts:
/// 0. `[signer]` Caller (anyone — permissionless)
/// 1. `[writable]` Config PDA
/// 2. `[writable]` Task PDA
/// 3. `[writable]` Claimer wallet (receives payment)
/// 4. `[writable]` Treasury PDA (receives fee)
/// 5. `[]` System program
pub fn process_claim_expired(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [caller_info, config_info, task_info, claimer_info, treasury_info, _system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    let _args = bytemuck::try_from_bytes::<ClaimExpiredArgs>(data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    caller_info.is_signer()?;

    let config = config_info.as_account_mut::<Config>(&bountyboard_api::ID)?;
    let task = task_info.as_account_mut::<Task>(&bountyboard_api::ID)?;

    // Must be in SUBMITTED status
    if task.status != STATUS_SUBMITTED {
        return Err(BountyBoardError::InvalidTaskStatus.into());
    }

    // Verify claimer account matches task's claimer
    if task.claimer != *claimer_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify treasury
    if config.treasury != *treasury_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Check that submitted_at is set and timeout has elapsed
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    if task.submitted_at == 0 {
        return Err(BountyBoardError::AutoReleaseNotReady.into());
    }

    let elapsed = now.checked_sub(task.submitted_at).ok_or(BountyBoardError::Overflow)?;
    if elapsed < AUTO_RELEASE_TIMEOUT {
        return Err(BountyBoardError::AutoReleaseNotReady.into());
    }

    // Same payout logic as ApproveWork — fee to treasury, rest to claimer
    let fee = task
        .bounty
        .checked_mul(config.protocol_fee_bps as u64)
        .ok_or(BountyBoardError::Overflow)?
        .checked_div(TOTAL_BPS)
        .ok_or(BountyBoardError::Overflow)?;

    let payment = task
        .bounty
        .checked_sub(fee)
        .ok_or(BountyBoardError::Overflow)?;

    // Transfer payment from Task PDA to claimer
    **task_info.try_borrow_mut_lamports()? -= payment;
    **claimer_info.try_borrow_mut_lamports()? += payment;

    // Transfer fee from Task PDA to treasury
    **task_info.try_borrow_mut_lamports()? -= fee;
    **treasury_info.try_borrow_mut_lamports()? += fee;

    // Update task status to completed
    task.status = STATUS_COMPLETED;

    // Update config stats
    config.total_escrowed = config
        .total_escrowed
        .checked_sub(task.bounty)
        .ok_or(BountyBoardError::Overflow)?;
    config.total_completed = config
        .total_completed
        .checked_add(1)
        .ok_or(BountyBoardError::Overflow)?;

    solana_program::msg!(
        "BountyBoard: Task {} auto-released after {}s timeout. Payment: {} lamports to worker",
        task.id,
        elapsed,
        payment
    );

    Ok(())
}
