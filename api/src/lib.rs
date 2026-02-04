pub mod consts;
pub mod error;
pub mod instruction;
pub mod sdk;
pub mod state;

pub use consts::*;
pub use error::*;
pub use instruction::*;
pub use sdk::*;
pub use state::*;

use steel::*;

// Program ID — replace with actual keypair after `solana-keygen grind`
declare_id!("GJgmGsoz1JaiPpKTTTeZD31TrxZqF7x7gtwuqhDJHHX1");
