use bytemuck::{Pod, Zeroable};
use solana_program::pubkey::Pubkey;
use steel::*;

use super::BountyBoardAccount;

/// Task escrow account
///
/// PDA Seeds: ["task", task_id.to_le_bytes()]
///
/// SOL is stored directly in this PDA as lamports (escrow pattern).
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct Task {
    /// Unique task ID (sequential)
    pub id: u64,                    // 8
    /// Creator who posted the task
    pub creator: Pubkey,            // 32
    /// Agent who claimed the task (Pubkey::default() if unclaimed)
    pub claimer: Pubkey,            // 32
    /// Bounty amount in lamports
    pub bounty: u64,                // 8
    /// SHA256 hash of the task description
    pub description_hash: [u8; 32], // 32
    /// SHA256 hash of the submitted proof
    pub proof_hash: [u8; 32],       // 32
    /// Task status: 0=Open, 1=Claimed, 2=Submitted, 3=Completed, 4=Cancelled, 5=Disputed
    pub status: u8,                 // 1
    /// Padding for alignment
    pub _padding: [u8; 7],          // 7
    /// Unix timestamp when task was created
    pub created_at: i64,            // 8
    /// Deadline unix timestamp (0 = no deadline)
    pub deadline: i64,              // 8
    /// Compact tag encoding for categorization
    pub tags: [u8; 16],             // 16
}

account!(BountyBoardAccount, Task);
