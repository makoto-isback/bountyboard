use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program_error::ProgramError,
};
use steel::*;
use bountyboard_api::{
    consts::*,
    error::BountyBoardError,
    instruction::RejectWorkArgs,
    state::Task,
};

/// Process RejectWork instruction
///
/// Creator rejects submitted work. Task goes back to OPEN, claimer removed.
///
/// Accounts:
/// 0. `[signer]` Creator wallet
/// 1. `[writable]` Task PDA
pub fn process_reject_work(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [creator_info, task_info] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    let _args = bytemuck::try_from_bytes::<RejectWorkArgs>(data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    creator_info.is_signer()?;

    let task = task_info.as_account_mut::<Task>(&bountyboard_api::ID)?;

    // Must be submitted
    if task.status != STATUS_SUBMITTED {
        return Err(BountyBoardError::InvalidTaskStatus.into());
    }

    // Only creator can reject
    if task.creator != *creator_info.key {
        return Err(BountyBoardError::NotCreator.into());
    }

    // Reset task to open
    task.claimer = solana_program::pubkey::Pubkey::default();
    task.proof_hash = [0u8; 32];
    task.status = STATUS_OPEN;

    solana_program::msg!("BountyBoard: Task {} rejected, returned to OPEN", task.id);

    Ok(())
}
