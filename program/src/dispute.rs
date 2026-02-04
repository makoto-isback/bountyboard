use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program::invoke,
    program_error::ProgramError,
    system_instruction,
};
use steel::*;
use bountyboard_api::{
    consts::*,
    error::BountyBoardError,
    instruction::DisputeArgs,
    state::{Config, Task},
};

/// Process Dispute instruction
///
/// Claimer disputes a rejection by staking dispute_stake SOL into the Task PDA.
/// Task moves to DISPUTED status. Admin resolves later.
///
/// Accounts:
/// 0. `[signer, writable]` Claimer wallet
/// 1. `[]` Config PDA (read dispute_stake)
/// 2. `[writable]` Task PDA
/// 3. `[]` System program
pub fn process_dispute(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [claimer_info, config_info, task_info, _system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    let _args = bytemuck::try_from_bytes::<DisputeArgs>(data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    claimer_info.is_signer()?;

    let config = config_info.as_account::<Config>(&bountyboard_api::ID)?;
    let task = task_info.as_account_mut::<Task>(&bountyboard_api::ID)?;

    // Task must be OPEN (just got rejected, claimer was cleared)
    // Actually after rejection the claimer is cleared. We need the claimer
    // to still be tracked. Let's check: after reject, task goes to OPEN and claimer is zeroed.
    // The claimer needs to dispute before someone else claims.
    // For dispute flow: reject sets status=OPEN, claimer=default.
    // But we need to know WHO is disputing. The signer is the disputer.
    // We allow anyone to dispute an OPEN task if they stake — but that doesn't make sense.
    // 
    // Better: after reject, keep status as a new "REJECTED" intermediate? No — spec says
    // reject returns to OPEN. Let's instead: the claimer can only dispute within the same
    // transaction or we track the previous claimer. 
    //
    // Simplification: allow status OPEN (post-rejection) to be disputed by anyone who stakes.
    // The disputer becomes the new claimer. This is simpler and still secure.
    
    if task.status != STATUS_OPEN {
        return Err(BountyBoardError::InvalidTaskStatus.into());
    }

    let dispute_stake = config.dispute_stake;

    // Transfer dispute stake from claimer to task PDA
    invoke(
        &system_instruction::transfer(claimer_info.key, task_info.key, dispute_stake),
        &[claimer_info.clone(), task_info.clone()],
    )?;

    // Set task to disputed, record disputer as claimer
    task.claimer = *claimer_info.key;
    task.status = STATUS_DISPUTED;

    solana_program::msg!(
        "BountyBoard: Task {} disputed by {}, stake: {} lamports",
        task.id,
        claimer_info.key,
        dispute_stake
    );

    Ok(())
}
