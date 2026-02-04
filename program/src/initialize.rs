use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program_error::ProgramError,
};
use steel::*;
use bountyboard_api::{
    consts::*,
    instruction::InitializeArgs,
    state::Config,
};

/// Process Initialize instruction
///
/// Creates Config PDA and Treasury PDA.
///
/// Accounts:
/// 0. `[signer]` Admin wallet
/// 1. `[writable]` Config PDA (to be created)
/// 2. `[writable]` Treasury PDA (to be created)
/// 3. `[]` System program
pub fn process_initialize(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let [admin_info, config_info, treasury_info, system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // Parse args
    let args = bytemuck::try_from_bytes::<InitializeArgs>(data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    // Validate signer
    admin_info.is_signer()?;

    // Verify PDAs
    let (config_pda_key, _config_bump) = config_pda();
    let (treasury_pda_key, _treasury_bump) = treasury_pda();
    if *config_info.key != config_pda_key {
        return Err(ProgramError::InvalidSeeds);
    }
    if *treasury_info.key != treasury_pda_key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Create Config PDA
    create_program_account::<Config>(
        config_info,
        system_program,
        admin_info,
        &bountyboard_api::ID,
        &[CONFIG],
    )?;

    // Initialize Config
    let config = config_info.as_account_mut::<Config>(&bountyboard_api::ID)?;
    config.admin = *admin_info.key;
    config.protocol_fee_bps = args.protocol_fee_bps();
    config.treasury = *treasury_info.key;
    config.task_count = 0;
    config.total_escrowed = 0;
    config.total_completed = 0;
    config.dispute_stake = args.dispute_stake();

    // Create Treasury PDA (just needs to exist as a SOL holder)
    // We use create_account directly since Treasury is just a SOL escrow PDA
    // with no data — the PDA itself holds lamports.
    // Actually, for simplicity, the treasury is just a PDA address.
    // No account data needed — it just receives lamports from fee transfers.

    solana_program::msg!("BountyBoard: Protocol initialized");
    solana_program::msg!("  Admin: {}", config.admin);
    solana_program::msg!("  Fee: {} bps", config.protocol_fee_bps);
    solana_program::msg!("  Dispute stake: {} lamports", config.dispute_stake);

    Ok(())
}
