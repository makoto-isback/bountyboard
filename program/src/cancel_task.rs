use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program_error::ProgramError,
};
use steel::*;
use bountyboard_api::{
    consts::*,
    error::BountyBoardError,
    instruction::CancelTaskArgs,
    state::{Config, Task},
};

/// Process CancelTask instruction
///
/// Creator cancels an unclaimed (OPEN) task. Full bounty refund.
///
/// Accounts:
/// 0. `[signer, writable]` Creator wallet
/// 1. `[writable]` Config PDA
/// 2. `[writable]` Task PDA
/// 3. `[]` System program
pub fn process_cancel_task(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [creator_info, config_info, task_info, _system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    let _args = bytemuck::try_from_bytes::<CancelTaskArgs>(data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    creator_info.is_signer()?;

    let config = config_info.as_account_mut::<Config>(&bountyboard_api::ID)?;
    let task = task_info.as_account_mut::<Task>(&bountyboard_api::ID)?;

    // Must be open (unclaimed)
    if task.status != STATUS_OPEN {
        return Err(BountyBoardError::TaskAlreadyClaimed.into());
    }

    // Only creator can cancel
    if task.creator != *creator_info.key {
        return Err(BountyBoardError::NotCreator.into());
    }

    let bounty = task.bounty;

    // Refund bounty from Task PDA to creator
    **task_info.try_borrow_mut_lamports()? -= bounty;
    **creator_info.try_borrow_mut_lamports()? += bounty;

    // Update task status
    task.status = STATUS_CANCELLED;

    // Update config
    config.total_escrowed = config
        .total_escrowed
        .checked_sub(bounty)
        .ok_or(BountyBoardError::Overflow)?;

    solana_program::msg!("BountyBoard: Task {} cancelled, refunded {} lamports", task.id, bounty);

    Ok(())
}
