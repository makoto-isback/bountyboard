use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program_error::ProgramError,
};
use steel::*;
use bountyboard_api::{
    consts::*,
    error::BountyBoardError,
    instruction::ResolveDisputeArgs,
    state::{Config, Task},
};

/// Process ResolveDispute instruction
///
/// Admin resolves a disputed task.
/// - winner=0: Creator wins → bounty refunded to creator, dispute stake to treasury
/// - winner=1: Claimer wins → bounty+stake to claimer (minus protocol fee), fee to treasury
///
/// Accounts:
/// 0. `[signer]` Admin wallet
/// 1. `[]` Config PDA
/// 2. `[writable]` Task PDA
/// 3. `[writable]` Claimer wallet
/// 4. `[writable]` Creator wallet
/// 5. `[writable]` Treasury PDA
/// 6. `[]` System program
pub fn process_resolve_dispute(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [admin_info, config_info, task_info, claimer_info, creator_info, treasury_info, _system_program] =
        accounts
    else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    let args = bytemuck::try_from_bytes::<ResolveDisputeArgs>(data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    admin_info.is_signer()?;

    let config = config_info.as_account::<Config>(&bountyboard_api::ID)?;

    // Verify admin
    if config.admin != *admin_info.key {
        return Err(BountyBoardError::Unauthorized.into());
    }

    let task = task_info.as_account_mut::<Task>(&bountyboard_api::ID)?;

    // Must be disputed
    if task.status != STATUS_DISPUTED {
        return Err(BountyBoardError::TaskNotDisputed.into());
    }

    // Verify accounts match task
    if task.claimer != *claimer_info.key {
        return Err(ProgramError::InvalidAccountData);
    }
    if task.creator != *creator_info.key {
        return Err(ProgramError::InvalidAccountData);
    }
    if config.treasury != *treasury_info.key {
        return Err(ProgramError::InvalidAccountData);
    }

    let dispute_stake = config.dispute_stake;
    let bounty = task.bounty;

    match args.winner {
        0 => {
            // Creator wins: refund bounty to creator, dispute stake to treasury
            **task_info.try_borrow_mut_lamports()? -= bounty;
            **creator_info.try_borrow_mut_lamports()? += bounty;

            **task_info.try_borrow_mut_lamports()? -= dispute_stake;
            **treasury_info.try_borrow_mut_lamports()? += dispute_stake;

            task.status = STATUS_CANCELLED;
            solana_program::msg!("BountyBoard: Dispute resolved for task {} — creator wins", task.id);
        }
        1 => {
            // Claimer wins: bounty (minus fee) + stake back to claimer, fee to treasury
            let fee = bounty
                .checked_mul(config.protocol_fee_bps as u64)
                .ok_or(BountyBoardError::Overflow)?
                .checked_div(TOTAL_BPS)
                .ok_or(BountyBoardError::Overflow)?;

            let payment = bounty
                .checked_sub(fee)
                .ok_or(BountyBoardError::Overflow)?;

            // Payment + stake back to claimer
            let claimer_total = payment
                .checked_add(dispute_stake)
                .ok_or(BountyBoardError::Overflow)?;

            **task_info.try_borrow_mut_lamports()? -= claimer_total;
            **claimer_info.try_borrow_mut_lamports()? += claimer_total;

            // Fee to treasury
            **task_info.try_borrow_mut_lamports()? -= fee;
            **treasury_info.try_borrow_mut_lamports()? += fee;

            task.status = STATUS_COMPLETED;
            solana_program::msg!("BountyBoard: Dispute resolved for task {} — claimer wins", task.id);
        }
        _ => {
            return Err(BountyBoardError::InvalidDisputeWinner.into());
        }
    }

    Ok(())
}
