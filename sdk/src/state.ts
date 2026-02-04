import { PublicKey } from "@solana/web3.js";
import { DISCRIMINATOR_SIZE } from "./constants";
import { ConfigAccount, TaskAccount, TaskStatus } from "./types";

/**
 * Parse a Config account from raw account data.
 * Layout (after 8-byte Steel discriminator):
 *   admin: 32 bytes (Pubkey)
 *   protocol_fee_bps: 2 bytes (u16 LE)
 *   _padding: 6 bytes
 *   treasury: 32 bytes (Pubkey)
 *   task_count: 8 bytes (u64 LE)
 *   total_escrowed: 8 bytes (u64 LE)
 *   total_completed: 8 bytes (u64 LE)
 *   dispute_stake: 8 bytes (u64 LE)
 */
export function parseConfig(data: Buffer): ConfigAccount {
  let offset = DISCRIMINATOR_SIZE;

  const admin = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const protocolFeeBps = data.readUInt16LE(offset);
  offset += 2;

  // skip padding
  offset += 6;

  const treasury = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const taskCount = data.readBigUInt64LE(offset);
  offset += 8;

  const totalEscrowed = data.readBigUInt64LE(offset);
  offset += 8;

  const totalCompleted = data.readBigUInt64LE(offset);
  offset += 8;

  const disputeStake = data.readBigUInt64LE(offset);

  return {
    admin,
    protocolFeeBps,
    treasury,
    taskCount,
    totalEscrowed,
    totalCompleted,
    disputeStake,
  };
}

/**
 * Parse a Task account from raw account data.
 * Layout (after 8-byte Steel discriminator):
 *   id: 8 bytes (u64 LE)
 *   creator: 32 bytes (Pubkey)
 *   claimer: 32 bytes (Pubkey)
 *   bounty: 8 bytes (u64 LE)
 *   description_hash: 32 bytes
 *   proof_hash: 32 bytes
 *   status: 1 byte (u8)
 *   _padding: 7 bytes
 *   created_at: 8 bytes (i64 LE)
 *   deadline: 8 bytes (i64 LE)
 *   tags: 16 bytes
 */
export function parseTask(data: Buffer): TaskAccount {
  let offset = DISCRIMINATOR_SIZE;

  const id = data.readBigUInt64LE(offset);
  offset += 8;

  const creator = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const claimer = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const bounty = data.readBigUInt64LE(offset);
  offset += 8;

  const descriptionHash = new Uint8Array(data.subarray(offset, offset + 32));
  offset += 32;

  const proofHash = new Uint8Array(data.subarray(offset, offset + 32));
  offset += 32;

  const status = data.readUInt8(offset) as TaskStatus;
  offset += 1;

  // skip padding
  offset += 7;

  const createdAt = data.readBigInt64LE(offset);
  offset += 8;

  const deadline = data.readBigInt64LE(offset);
  offset += 8;

  const tags = new Uint8Array(data.subarray(offset, offset + 16));

  return {
    id,
    creator,
    claimer,
    bounty,
    descriptionHash,
    proofHash,
    status,
    createdAt,
    deadline,
    tags,
  };
}
