mod config;
mod task;

pub use config::*;
pub use task::*;

use num_enum::{IntoPrimitive, TryFromPrimitive};

/// Account discriminators for the BountyBoard program
#[repr(u8)]
#[derive(Clone, Copy, Debug, Eq, PartialEq, IntoPrimitive, TryFromPrimitive)]
pub enum BountyBoardAccount {
    /// Global configuration account
    Config = 0,
    /// Task escrow account
    Task = 1,
}
