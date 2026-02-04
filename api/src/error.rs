use steel::*;

/// Errors for the BountyBoard program
#[derive(Debug, Error, Clone, Copy, PartialEq, Eq, IntoPrimitive)]
#[repr(u32)]
pub enum BountyBoardError {
    #[error("Unauthorized — not admin or not authorized")]
    Unauthorized = 0,

    #[error("Task is not in the expected status")]
    InvalidTaskStatus = 1,

    #[error("Bounty amount too small")]
    BountyTooSmall = 2,

    #[error("Arithmetic overflow")]
    Overflow = 3,

    #[error("Task is not open for claiming")]
    TaskNotOpen = 4,

    #[error("Only the claimer can submit work")]
    NotClaimer = 5,

    #[error("Only the creator can approve or reject")]
    NotCreator = 6,

    #[error("Task deadline has passed")]
    DeadlinePassed = 7,

    #[error("Cannot cancel a claimed task")]
    TaskAlreadyClaimed = 8,

    #[error("Insufficient dispute stake")]
    InsufficientDisputeStake = 9,

    #[error("Only the claimer can dispute")]
    OnlyClaimerCanDispute = 10,

    #[error("Task is not in disputed state")]
    TaskNotDisputed = 11,

    #[error("Invalid winner for dispute resolution")]
    InvalidDisputeWinner = 12,

    #[error("Auto-release timeout has not elapsed yet")]
    AutoReleaseNotReady = 13,
}

error!(BountyBoardError);
