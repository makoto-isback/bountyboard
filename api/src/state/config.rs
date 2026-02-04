use bytemuck::{Pod, Zeroable};
use solana_program::pubkey::Pubkey;
use steel::*;

use super::BountyBoardAccount;

/// Global configuration account for BountyBoard
///
/// PDA Seeds: ["config"]
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct Config {
    /// Admin wallet authorized to manage the protocol
    pub admin: Pubkey,           // 32
    /// Protocol fee in basis points (e.g. 200 = 2%)
    pub protocol_fee_bps: u16,   // 2
    /// Padding for alignment
    pub _padding: [u8; 6],       // 6
    /// Treasury PDA that collects fees
    pub treasury: Pubkey,        // 32
    /// Total number of tasks created
    pub task_count: u64,         // 8
    /// Total SOL currently escrowed across all tasks
    pub total_escrowed: u64,     // 8
    /// Total tasks completed
    pub total_completed: u64,    // 8
    /// Lamports required to file a dispute
    pub dispute_stake: u64,      // 8
}

account!(BountyBoardAccount, Config);
