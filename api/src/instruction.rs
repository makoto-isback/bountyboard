use bytemuck::{Pod, Zeroable};
use num_enum::TryFromPrimitive;

/// Instructions for the BountyBoard program
#[repr(u8)]
#[derive(Clone, Copy, Debug, Eq, PartialEq, TryFromPrimitive)]
pub enum BountyBoardInstruction {
    /// Initialize the protocol
    Initialize = 0,
    /// Create a new task with bounty escrow
    CreateTask = 1,
    /// Claim an open task
    ClaimTask = 2,
    /// Submit work proof for a claimed task
    SubmitWork = 3,
    /// Approve submitted work (releases escrow)
    ApproveWork = 4,
    /// Reject submitted work (task returns to open)
    RejectWork = 5,
    /// Dispute a rejection
    Dispute = 6,
    /// Admin resolves a dispute
    ResolveDispute = 7,
    /// Cancel an unclaimed task (refund creator)
    CancelTask = 8,
    /// Auto-release expired escrow to worker (permissionless, anyone can call after timeout)
    ClaimExpired = 9,
}

// =============================================================================
// INSTRUCTION ARGS
// =============================================================================

/// Arguments for Initialize
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct InitializeArgs {
    /// Protocol fee in basis points (e.g. 200 = 2%)
    pub protocol_fee_bps: [u8; 2],
    /// Padding
    pub _padding: [u8; 6],
    /// Dispute stake in lamports
    pub dispute_stake: [u8; 8],
}

impl InitializeArgs {
    pub fn new(protocol_fee_bps: u16, dispute_stake: u64) -> Self {
        Self {
            protocol_fee_bps: protocol_fee_bps.to_le_bytes(),
            _padding: [0u8; 6],
            dispute_stake: dispute_stake.to_le_bytes(),
        }
    }
    pub fn protocol_fee_bps(&self) -> u16 {
        u16::from_le_bytes(self.protocol_fee_bps)
    }
    pub fn dispute_stake(&self) -> u64 {
        u64::from_le_bytes(self.dispute_stake)
    }
}

/// Arguments for CreateTask
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct CreateTaskArgs {
    /// Bounty amount in lamports
    pub bounty: [u8; 8],
    /// SHA256 hash of the task description
    pub description_hash: [u8; 32],
    /// Deadline as unix timestamp (0 = no deadline)
    pub deadline: [u8; 8],
    /// Compact tag encoding
    pub tags: [u8; 16],
}

impl CreateTaskArgs {
    pub fn new(bounty: u64, description_hash: [u8; 32], deadline: i64, tags: [u8; 16]) -> Self {
        Self {
            bounty: bounty.to_le_bytes(),
            description_hash,
            deadline: deadline.to_le_bytes(),
            tags,
        }
    }
    pub fn bounty(&self) -> u64 {
        u64::from_le_bytes(self.bounty)
    }
    pub fn deadline(&self) -> i64 {
        i64::from_le_bytes(self.deadline)
    }
}

/// Arguments for ClaimTask
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct ClaimTaskArgs {
    /// Task ID to claim
    pub task_id: [u8; 8],
}

impl ClaimTaskArgs {
    pub fn new(task_id: u64) -> Self {
        Self {
            task_id: task_id.to_le_bytes(),
        }
    }
    pub fn task_id(&self) -> u64 {
        u64::from_le_bytes(self.task_id)
    }
}

/// Arguments for SubmitWork
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct SubmitWorkArgs {
    /// Task ID
    pub task_id: [u8; 8],
    /// SHA256 hash of the proof (IPFS CID, URL, etc)
    pub proof_hash: [u8; 32],
}

impl SubmitWorkArgs {
    pub fn new(task_id: u64, proof_hash: [u8; 32]) -> Self {
        Self {
            task_id: task_id.to_le_bytes(),
            proof_hash,
        }
    }
    pub fn task_id(&self) -> u64 {
        u64::from_le_bytes(self.task_id)
    }
}

/// Arguments for ApproveWork
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct ApproveWorkArgs {
    /// Task ID
    pub task_id: [u8; 8],
}

impl ApproveWorkArgs {
    pub fn new(task_id: u64) -> Self {
        Self {
            task_id: task_id.to_le_bytes(),
        }
    }
    pub fn task_id(&self) -> u64 {
        u64::from_le_bytes(self.task_id)
    }
}

/// Arguments for RejectWork
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct RejectWorkArgs {
    /// Task ID
    pub task_id: [u8; 8],
}

impl RejectWorkArgs {
    pub fn new(task_id: u64) -> Self {
        Self {
            task_id: task_id.to_le_bytes(),
        }
    }
    pub fn task_id(&self) -> u64 {
        u64::from_le_bytes(self.task_id)
    }
}

/// Arguments for Dispute
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct DisputeArgs {
    /// Task ID
    pub task_id: [u8; 8],
}

impl DisputeArgs {
    pub fn new(task_id: u64) -> Self {
        Self {
            task_id: task_id.to_le_bytes(),
        }
    }
    pub fn task_id(&self) -> u64 {
        u64::from_le_bytes(self.task_id)
    }
}

/// Arguments for ResolveDispute
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct ResolveDisputeArgs {
    /// Task ID
    pub task_id: [u8; 8],
    /// Winner: 0 = creator wins (claimer loses stake), 1 = claimer wins (gets bounty + stake back)
    pub winner: u8,
    /// Padding
    pub _padding: [u8; 7],
}

impl ResolveDisputeArgs {
    pub fn new(task_id: u64, winner: u8) -> Self {
        Self {
            task_id: task_id.to_le_bytes(),
            winner,
            _padding: [0u8; 7],
        }
    }
    pub fn task_id(&self) -> u64 {
        u64::from_le_bytes(self.task_id)
    }
}

/// Arguments for CancelTask
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct CancelTaskArgs {
    /// Task ID
    pub task_id: [u8; 8],
}

impl CancelTaskArgs {
    pub fn new(task_id: u64) -> Self {
        Self {
            task_id: task_id.to_le_bytes(),
        }
    }
    pub fn task_id(&self) -> u64 {
        u64::from_le_bytes(self.task_id)
    }
}

/// Arguments for ClaimExpired
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Pod, Zeroable)]
pub struct ClaimExpiredArgs {
    /// Task ID
    pub task_id: [u8; 8],
}

impl ClaimExpiredArgs {
    pub fn new(task_id: u64) -> Self {
        Self {
            task_id: task_id.to_le_bytes(),
        }
    }
    pub fn task_id(&self) -> u64 {
        u64::from_le_bytes(self.task_id)
    }
}
