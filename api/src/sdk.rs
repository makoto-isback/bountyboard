//! SDK for building BountyBoard instructions (Rust side)

use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    system_program,
};

use crate::consts::{config_pda, task_pda, treasury_pda};
use crate::instruction::*;

/// Build an Initialize instruction
pub fn initialize(admin: Pubkey, protocol_fee_bps: u16, dispute_stake: u64) -> Instruction {
    let config_address = config_pda().0;
    let treasury_address = treasury_pda().0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(admin, true),
            AccountMeta::new(config_address, false),
            AccountMeta::new(treasury_address, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: [
            vec![BountyBoardInstruction::Initialize as u8],
            bytemuck::bytes_of(&InitializeArgs::new(protocol_fee_bps, dispute_stake)).to_vec(),
        ]
        .concat(),
    }
}

/// Build a CreateTask instruction
pub fn create_task(
    creator: Pubkey,
    task_id: u64,
    bounty: u64,
    description_hash: [u8; 32],
    deadline: i64,
    tags: [u8; 16],
) -> Instruction {
    let config_address = config_pda().0;
    let task_address = task_pda(task_id).0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(creator, true),
            AccountMeta::new(config_address, false),
            AccountMeta::new(task_address, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: [
            vec![BountyBoardInstruction::CreateTask as u8],
            bytemuck::bytes_of(&CreateTaskArgs::new(bounty, description_hash, deadline, tags)).to_vec(),
        ]
        .concat(),
    }
}

/// Build a ClaimTask instruction
pub fn claim_task(claimer: Pubkey, task_id: u64) -> Instruction {
    let task_address = task_pda(task_id).0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(claimer, true),
            AccountMeta::new(task_address, false),
        ],
        data: [
            vec![BountyBoardInstruction::ClaimTask as u8],
            bytemuck::bytes_of(&ClaimTaskArgs::new(task_id)).to_vec(),
        ]
        .concat(),
    }
}

/// Build a SubmitWork instruction
pub fn submit_work(claimer: Pubkey, task_id: u64, proof_hash: [u8; 32]) -> Instruction {
    let task_address = task_pda(task_id).0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(claimer, true),
            AccountMeta::new(task_address, false),
        ],
        data: [
            vec![BountyBoardInstruction::SubmitWork as u8],
            bytemuck::bytes_of(&SubmitWorkArgs::new(task_id, proof_hash)).to_vec(),
        ]
        .concat(),
    }
}

/// Build an ApproveWork instruction
pub fn approve_work(creator: Pubkey, task_id: u64, claimer: Pubkey) -> Instruction {
    let config_address = config_pda().0;
    let task_address = task_pda(task_id).0;
    let treasury_address = treasury_pda().0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(creator, true),
            AccountMeta::new(config_address, false),
            AccountMeta::new(task_address, false),
            AccountMeta::new(claimer, false),
            AccountMeta::new(treasury_address, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: [
            vec![BountyBoardInstruction::ApproveWork as u8],
            bytemuck::bytes_of(&ApproveWorkArgs::new(task_id)).to_vec(),
        ]
        .concat(),
    }
}

/// Build a RejectWork instruction
pub fn reject_work(creator: Pubkey, task_id: u64) -> Instruction {
    let task_address = task_pda(task_id).0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(creator, true),
            AccountMeta::new(task_address, false),
        ],
        data: [
            vec![BountyBoardInstruction::RejectWork as u8],
            bytemuck::bytes_of(&RejectWorkArgs::new(task_id)).to_vec(),
        ]
        .concat(),
    }
}

/// Build a Dispute instruction
pub fn dispute(claimer: Pubkey, task_id: u64) -> Instruction {
    let config_address = config_pda().0;
    let task_address = task_pda(task_id).0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(claimer, true),
            AccountMeta::new(config_address, false),
            AccountMeta::new(task_address, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: [
            vec![BountyBoardInstruction::Dispute as u8],
            bytemuck::bytes_of(&DisputeArgs::new(task_id)).to_vec(),
        ]
        .concat(),
    }
}

/// Build a ResolveDispute instruction
pub fn resolve_dispute(admin: Pubkey, task_id: u64, winner: u8, claimer: Pubkey, creator: Pubkey) -> Instruction {
    let config_address = config_pda().0;
    let task_address = task_pda(task_id).0;
    let treasury_address = treasury_pda().0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(admin, true),
            AccountMeta::new(config_address, false),
            AccountMeta::new(task_address, false),
            AccountMeta::new(claimer, false),
            AccountMeta::new(creator, false),
            AccountMeta::new(treasury_address, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: [
            vec![BountyBoardInstruction::ResolveDispute as u8],
            bytemuck::bytes_of(&ResolveDisputeArgs::new(task_id, winner)).to_vec(),
        ]
        .concat(),
    }
}

/// Build a CancelTask instruction
pub fn cancel_task(creator: Pubkey, task_id: u64) -> Instruction {
    let config_address = config_pda().0;
    let task_address = task_pda(task_id).0;

    Instruction {
        program_id: crate::ID,
        accounts: vec![
            AccountMeta::new(creator, true),
            AccountMeta::new(config_address, false),
            AccountMeta::new(task_address, false),
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: [
            vec![BountyBoardInstruction::CancelTask as u8],
            bytemuck::bytes_of(&CancelTaskArgs::new(task_id)).to_vec(),
        ]
        .concat(),
    }
}
