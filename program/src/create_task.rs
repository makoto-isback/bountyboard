use solana_program::{
    account_info::AccountInfo,
    clock::Clock,
    entrypoint::ProgramResult,
    program::invoke,
    program_error::ProgramError,
    system_instruction,
    sysvar::Sysvar,
};
use steel::*;
use bountyboard_api::{
    consts::*,
    error::BountyBoardError,
    instruction::CreateTaskArgs,
    state::{Config, Task},
};

/// Process CreateTask instruction
///
/// Creator posts a task with bounty. SOL is locked in the Task PDA.
///
/// Accounts:
/// 0. `[signer, writable]` Creator wallet
/// 1. `[writable]` Config PDA
/// 2. `[writable]` Task PDA (to be created)
/// 3. `[]` System program
pub fn process_create_task(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [creator_info, config_info, task_info, system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    let args = bytemuck::try_from_bytes::<CreateTaskArgs>(data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    creator_info.is_signer()?;

    let bounty = args.bounty();
    if bounty < MIN_BOUNTY {
        return Err(BountyBoardError::BountyTooSmall.into());
    }

    // Load config to get next task_id
    let config = config_info.as_account_mut::<Config>(&bountyboard_api::ID)?;
    let task_id = config.task_count;

    // Verify task PDA
    let (task_pda_key, _task_bump) = task_pda(task_id);
    if *task_info.key != task_pda_key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Create Task PDA
    create_program_account::<Task>(
        task_info,
        system_program,
        creator_info,
        &bountyboard_api::ID,
        &[TASK, &task_id.to_le_bytes()],
    )?;

    // Transfer bounty SOL from creator to task PDA (escrow)
    invoke(
        &system_instruction::transfer(creator_info.key, task_info.key, bounty),
        &[creator_info.clone(), task_info.clone()],
    )?;

    // Initialize task
    let clock = Clock::get()?;
    let task = task_info.as_account_mut::<Task>(&bountyboard_api::ID)?;
    task.id = task_id;
    task.creator = *creator_info.key;
    task.claimer = solana_program::pubkey::Pubkey::default();
    task.bounty = bounty;
    task.description_hash = args.description_hash;
    task.proof_hash = [0u8; 32];
    task.status = STATUS_OPEN;
    task.created_at = clock.unix_timestamp;
    task.deadline = args.deadline();
    task.tags = args.tags;

    // Update config
    config.task_count = task_id.checked_add(1).ok_or(BountyBoardError::Overflow)?;
    config.total_escrowed = config
        .total_escrowed
        .checked_add(bounty)
        .ok_or(BountyBoardError::Overflow)?;

    solana_program::msg!("BountyBoard: Task {} created with bounty {} lamports", task_id, bounty);

    Ok(())
}
