mod initialize;
mod create_task;
mod claim_task;
mod submit_work;
mod approve_work;
mod reject_work;
mod dispute;
mod resolve_dispute;
mod cancel_task;
mod claim_expired;

use initialize::*;
use create_task::*;
use claim_task::*;
use submit_work::*;
use approve_work::*;
use reject_work::*;
use dispute::*;
use resolve_dispute::*;
use cancel_task::*;
use claim_expired::*;

use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
    pubkey::Pubkey,
};
use steel::*;
use bountyboard_api::instruction::BountyBoardInstruction;

entrypoint!(process_instruction);

/// Main instruction router
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if *program_id != bountyboard_api::ID {
        return Err(ProgramError::IncorrectProgramId);
    }

    let (ix, data) = parse_instruction::<BountyBoardInstruction>(&bountyboard_api::ID, program_id, data)?;

    match ix {
        BountyBoardInstruction::Initialize => process_initialize(accounts, data)?,
        BountyBoardInstruction::CreateTask => process_create_task(accounts, data)?,
        BountyBoardInstruction::ClaimTask => process_claim_task(accounts, data)?,
        BountyBoardInstruction::SubmitWork => process_submit_work(accounts, data)?,
        BountyBoardInstruction::ApproveWork => process_approve_work(accounts, data)?,
        BountyBoardInstruction::RejectWork => process_reject_work(accounts, data)?,
        BountyBoardInstruction::Dispute => process_dispute(accounts, data)?,
        BountyBoardInstruction::ResolveDispute => process_resolve_dispute(accounts, data)?,
        BountyBoardInstruction::CancelTask => process_cancel_task(accounts, data)?,
        BountyBoardInstruction::ClaimExpired => process_claim_expired(accounts, data)?,
    }

    Ok(())
}
