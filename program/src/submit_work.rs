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
    instruction::SubmitWorkArgs,
    state::Task,
};

/// Process SubmitWork instruction
///
/// Claimer submits proof hash. Task moves to SUBMITTED.
///
/// Accounts:
/// 0. `[signer]` Claimer wallet
/// 1. `[writable]` Task PDA
pub fn process_submit_work(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [claimer_info, task_info] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    let args = bytemuck::try_from_bytes::<SubmitWorkArgs>(data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    claimer_info.is_signer()?;

    let task = task_info.as_account_mut::<Task>(&bountyboard_api::ID)?;

    // Must be claimed
    if task.status != STATUS_CLAIMED {
        return Err(BountyBoardError::InvalidTaskStatus.into());
    }

    // Only claimer can submit
    if task.claimer != *claimer_info.key {
        return Err(BountyBoardError::NotClaimer.into());
    }

    // Record proof, timestamp, and update status
    task.proof_hash = args.proof_hash;
    task.submitted_at = Clock::get()?.unix_timestamp;
    task.status = STATUS_SUBMITTED;

    solana_program::msg!("BountyBoard: Task {} work submitted", task.id);

    Ok(())
}
