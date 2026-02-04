import { PublicKey } from "@solana/web3.js";

// Must match the declare_id! in api/src/lib.rs
export const PROGRAM_ID = new PublicKey(
  "GJgmGsoz1JaiPpKTTTeZD31TrxZqF7x7gtwuqhDJHHX1"
);

export const CONFIG_SEED = Buffer.from("config");
export const TREASURY_SEED = Buffer.from("treasury");
export const TASK_SEED = Buffer.from("task");

// 8 bytes for Steel account discriminator
export const DISCRIMINATOR_SIZE = 8;
