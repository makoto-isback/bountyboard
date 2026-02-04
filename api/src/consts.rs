use solana_program::pubkey::Pubkey;

// =============================================================================
// PDA SEEDS
// =============================================================================

/// Seed for Config PDA: ["config"]
pub const CONFIG: &[u8] = b"config";

/// Seed for Treasury PDA: ["treasury"]
pub const TREASURY: &[u8] = b"treasury";

/// Seed for Task PDA: ["task", task_id.to_le_bytes()]
pub const TASK: &[u8] = b"task";

// =============================================================================
// PROTOCOL CONSTANTS
// =============================================================================

/// Default protocol fee in basis points (200 = 2%)
pub const DEFAULT_PROTOCOL_FEE_BPS: u16 = 200;

/// Total basis points (100%)
pub const TOTAL_BPS: u64 = 10_000;

/// Default dispute stake in lamports (0.1 SOL)
pub const DEFAULT_DISPUTE_STAKE: u64 = 100_000_000;

/// Minimum bounty in lamports (0.001 SOL)
pub const MIN_BOUNTY: u64 = 1_000_000;

// =============================================================================
// TASK STATUS
// =============================================================================

pub const STATUS_OPEN: u8 = 0;
pub const STATUS_CLAIMED: u8 = 1;
pub const STATUS_SUBMITTED: u8 = 2;
pub const STATUS_COMPLETED: u8 = 3;
pub const STATUS_CANCELLED: u8 = 4;
pub const STATUS_DISPUTED: u8 = 5;

// =============================================================================
// PDA HELPER FUNCTIONS
// =============================================================================

/// Derives the Config PDA address: ["config"]
pub fn config_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CONFIG], &crate::ID)
}

/// Derives the Treasury PDA address: ["treasury"]
pub fn treasury_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[TREASURY], &crate::ID)
}

/// Derives the Task PDA address for a given task ID: ["task", task_id]
pub fn task_pda(task_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[TASK, &task_id.to_le_bytes()], &crate::ID)
}
