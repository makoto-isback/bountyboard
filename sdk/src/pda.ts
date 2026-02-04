import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, CONFIG_SEED, TREASURY_SEED, TASK_SEED } from "./constants";

export function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
}

export function getTreasuryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([TREASURY_SEED], PROGRAM_ID);
}

export function getTaskPDA(taskId: bigint | number): [PublicKey, number] {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(taskId));
  return PublicKey.findProgramAddressSync([TASK_SEED, idBuffer], PROGRAM_ID);
}
