import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { BountyBoardInstruction } from "./types";
import { getConfigPDA, getTaskPDA, getTreasuryPDA } from "./pda";

// ============================================================================
// Helpers
// ============================================================================

function encodeU16LE(value: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(value);
  return buf;
}

function encodeU64LE(value: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

function encodeI64LE(value: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(value));
  return buf;
}

// ============================================================================
// Instructions
// ============================================================================

/**
 * Initialize the BountyBoard protocol.
 */
export function createInitializeInstruction(
  admin: PublicKey,
  protocolFeeBps: number = 200,
  disputeStake: bigint | number = 100_000_000n
): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [treasuryPDA] = getTreasuryPDA();

  // InitializeArgs: protocol_fee_bps (2) + padding (6) + dispute_stake (8) = 16 bytes
  const data = Buffer.concat([
    Buffer.from([BountyBoardInstruction.Initialize]),
    encodeU16LE(protocolFeeBps),
    Buffer.alloc(6), // padding
    encodeU64LE(disputeStake),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Create a new task with bounty escrow.
 */
export function createCreateTaskInstruction(
  creator: PublicKey,
  taskId: bigint | number,
  bounty: bigint | number,
  descriptionHash: Uint8Array,
  deadline: bigint | number = 0,
  tags: Uint8Array = new Uint8Array(16)
): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [taskPDA] = getTaskPDA(taskId);

  if (descriptionHash.length !== 32) throw new Error("descriptionHash must be 32 bytes");
  if (tags.length !== 16) throw new Error("tags must be 16 bytes");

  // CreateTaskArgs: bounty (8) + description_hash (32) + deadline (8) + tags (16) = 64 bytes
  const data = Buffer.concat([
    Buffer.from([BountyBoardInstruction.CreateTask]),
    encodeU64LE(bounty),
    Buffer.from(descriptionHash),
    encodeI64LE(deadline),
    Buffer.from(tags),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Claim an open task.
 */
export function createClaimTaskInstruction(
  claimer: PublicKey,
  taskId: bigint | number
): TransactionInstruction {
  const [taskPDA] = getTaskPDA(taskId);

  const data = Buffer.concat([
    Buffer.from([BountyBoardInstruction.ClaimTask]),
    encodeU64LE(taskId),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
    ],
    data,
  });
}

/**
 * Submit work proof for a claimed task.
 */
export function createSubmitWorkInstruction(
  claimer: PublicKey,
  taskId: bigint | number,
  proofHash: Uint8Array
): TransactionInstruction {
  const [taskPDA] = getTaskPDA(taskId);

  if (proofHash.length !== 32) throw new Error("proofHash must be 32 bytes");

  // SubmitWorkArgs: task_id (8) + proof_hash (32) = 40 bytes
  const data = Buffer.concat([
    Buffer.from([BountyBoardInstruction.SubmitWork]),
    encodeU64LE(taskId),
    Buffer.from(proofHash),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
    ],
    data,
  });
}

/**
 * Approve submitted work (creator only). Releases escrow.
 */
export function createApproveWorkInstruction(
  creator: PublicKey,
  taskId: bigint | number,
  claimer: PublicKey
): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [taskPDA] = getTaskPDA(taskId);
  const [treasuryPDA] = getTreasuryPDA();

  const data = Buffer.concat([
    Buffer.from([BountyBoardInstruction.ApproveWork]),
    encodeU64LE(taskId),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: claimer, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Reject submitted work (creator only). Task returns to OPEN.
 */
export function createRejectWorkInstruction(
  creator: PublicKey,
  taskId: bigint | number
): TransactionInstruction {
  const [taskPDA] = getTaskPDA(taskId);

  const data = Buffer.concat([
    Buffer.from([BountyBoardInstruction.RejectWork]),
    encodeU64LE(taskId),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
    ],
    data,
  });
}

/**
 * Dispute a rejection by staking dispute_stake SOL.
 */
export function createDisputeInstruction(
  claimer: PublicKey,
  taskId: bigint | number
): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [taskPDA] = getTaskPDA(taskId);

  const data = Buffer.concat([
    Buffer.from([BountyBoardInstruction.Dispute]),
    encodeU64LE(taskId),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Admin resolves a dispute.
 * @param winner 0 = creator wins, 1 = claimer wins
 */
export function createResolveDisputeInstruction(
  admin: PublicKey,
  taskId: bigint | number,
  winner: number,
  claimer: PublicKey,
  creator: PublicKey
): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [taskPDA] = getTaskPDA(taskId);
  const [treasuryPDA] = getTreasuryPDA();

  // ResolveDisputeArgs: task_id (8) + winner (1) + padding (7) = 16 bytes
  const data = Buffer.concat([
    Buffer.from([BountyBoardInstruction.ResolveDispute]),
    encodeU64LE(taskId),
    Buffer.from([winner]),
    Buffer.alloc(7), // padding
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: false },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: claimer, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Auto-release expired escrow to worker (permissionless).
 * Anyone can call this after 48h of submission without approval.
 */
export function createClaimExpiredInstruction(
  caller: PublicKey,
  taskId: bigint | number,
  claimer: PublicKey
): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [taskPDA] = getTaskPDA(taskId);
  const [treasuryPDA] = getTreasuryPDA();

  const data = Buffer.concat([
    Buffer.from([BountyBoardInstruction.ClaimExpired]),
    encodeU64LE(taskId),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: caller, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: claimer, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Cancel an unclaimed task. Full bounty refund to creator.
 */
export function createCancelTaskInstruction(
  creator: PublicKey,
  taskId: bigint | number
): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [taskPDA] = getTaskPDA(taskId);

  const data = Buffer.concat([
    Buffer.from([BountyBoardInstruction.CancelTask]),
    encodeU64LE(taskId),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}
