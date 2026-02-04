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
    instruction::ClaimTaskArgs,
    state::Task,
};

/// Process ClaimTask instruction
///
/// Agent claims an open task. Records claimer and optional deadline.
///
/// Accounts:
/// 0. `[signer]` Claimer wallet
/// 1. `[writable]` Task PDA
pub fn process_claim_task(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [claimer_info, task_info] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    let _args = bytemuck::try_from_bytes::<ClaimTaskArgs>(data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    claimer_info.is_signer()?;

    let task = task_info.as_account_mut::<Task>(&bountyboard_api::ID)?;

    // Task must be open
    if task.status != STATUS_OPEN {
        return Err(BountyBoardError::TaskNotOpen.into());
    }

    // Check deadline hasn't passed (if set)
    if task.deadline > 0 {
        let clock = Clock::get()?;
        if clock.unix_timestamp > task.deadline {
            return Err(BountyBoardError::DeadlinePassed.into());
        }
    }

    // Claim the task
    task.claimer = *claimer_info.key;
    task.status = STATUS_CLAIMED;

    solana_program::msg!("BountyBoard: Task {} claimed by {}", task.id, claimer_info.key);

    Ok(())
}
