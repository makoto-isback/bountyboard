use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program_error::ProgramError,
};
use steel::*;
use bountyboard_api::{
    consts::*,
    error::BountyBoardError,
    instruction::ApproveWorkArgs,
    state::{Config, Task},
};

/// Process ApproveWork instruction
///
/// Creator approves submitted work. Escrow releases:
/// - (bounty - fee) to claimer
/// - fee to treasury PDA
///
/// Accounts:
/// 0. `[signer]` Creator wallet
/// 1. `[writable]` Config PDA
/// 2. `[writable]` Task PDA
/// 3. `[writable]` Claimer wallet (receives payment)
/// 4. `[writable]` Treasury PDA (receives fee)
/// 5. `[]` System program
pub fn process_approve_work(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [creator_info, config_info, task_info, claimer_info, treasury_info, _system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    let _args = bytemuck::try_from_bytes::<ApproveWorkArgs>(data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    creator_info.is_signer()?;

    let config = config_info.as_account_mut::<Config>(&bountyboard_api::ID)?;
    let task = task_info.as_account_mut::<Task>(&bountyboard_api::ID)?;

    // Must be submitted
    if task.status != STATUS_SUBMITTED {
        return Err(BountyBoardError::InvalidTaskStatus.into());
    }

    // Only creator can approve
    if task.creator != *creator_info.key {
        return Err(BountyBoardError::NotCreator.into());
    }

    // Verify claimer account matches task's claimer
    if task.claimer != *claimer_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify treasury
    if config.treasury != *treasury_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Calculate fee and payment
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

    // Transfer payment from Task PDA to claimer (PDA -> wallet via lamport manipulation)
    **task_info.try_borrow_mut_lamports()? -= payment;
    **claimer_info.try_borrow_mut_lamports()? += payment;

    // Transfer fee from Task PDA to treasury
    **task_info.try_borrow_mut_lamports()? -= fee;
    **treasury_info.try_borrow_mut_lamports()? += fee;

    // Update task status
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
        "BountyBoard: Task {} approved. Payment: {} lamports, Fee: {} lamports",
        task.id,
        payment,
        fee
    );

    Ok(())
}
