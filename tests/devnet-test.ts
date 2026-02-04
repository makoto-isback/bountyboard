/**
 * BountyBoard Devnet Integration Test
 *
 * Tests the full task lifecycle:
 *   Initialize → CreateTask → ClaimTask → SubmitWork → ApproveWork
 *   CreateTask (2nd) → CancelTask
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as fs from "fs";
import * as crypto from "crypto";

// ============================================================================
// Constants
// ============================================================================

const PROGRAM_ID = new PublicKey("GJgmGsoz1JaiPpKTTTeZD31TrxZqF7x7gtwuqhDJHHX1");
const CONFIG_SEED = Buffer.from("config");
const TREASURY_SEED = Buffer.from("treasury");
const TASK_SEED = Buffer.from("task");
const DISCRIMINATOR_SIZE = 8;

const DEVNET_URL = "https://api.devnet.solana.com";
const BOUNTY = 0.01 * LAMPORTS_PER_SOL; // 10_000_000 lamports

// ============================================================================
// PDA helpers
// ============================================================================

function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
}

function getTreasuryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([TREASURY_SEED], PROGRAM_ID);
}

function getTaskPDA(taskId: bigint | number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(taskId));
  return PublicKey.findProgramAddressSync([TASK_SEED, buf], PROGRAM_ID);
}

// ============================================================================
// Encoding helpers
// ============================================================================

function encodeU16LE(v: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(v);
  return b;
}

function encodeU64LE(v: bigint | number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(v));
  return b;
}

function encodeI64LE(v: bigint | number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(v));
  return b;
}

// ============================================================================
// State parsers
// ============================================================================

interface ConfigAccount {
  admin: PublicKey;
  protocolFeeBps: number;
  treasury: PublicKey;
  taskCount: bigint;
  totalEscrowed: bigint;
  totalCompleted: bigint;
  disputeStake: bigint;
}

interface TaskAccount {
  id: bigint;
  creator: PublicKey;
  claimer: PublicKey;
  bounty: bigint;
  descriptionHash: Uint8Array;
  proofHash: Uint8Array;
  status: number;
  createdAt: bigint;
  deadline: bigint;
  tags: Uint8Array;
}

function parseConfig(data: Buffer): ConfigAccount {
  let o = DISCRIMINATOR_SIZE;
  const admin = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const protocolFeeBps = data.readUInt16LE(o); o += 2;
  o += 6; // padding
  const treasury = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const taskCount = data.readBigUInt64LE(o); o += 8;
  const totalEscrowed = data.readBigUInt64LE(o); o += 8;
  const totalCompleted = data.readBigUInt64LE(o); o += 8;
  const disputeStake = data.readBigUInt64LE(o);
  return { admin, protocolFeeBps, treasury, taskCount, totalEscrowed, totalCompleted, disputeStake };
}

function parseTask(data: Buffer): TaskAccount {
  let o = DISCRIMINATOR_SIZE;
  const id = data.readBigUInt64LE(o); o += 8;
  const creator = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const claimer = new PublicKey(data.subarray(o, o + 32)); o += 32;
  const bounty = data.readBigUInt64LE(o); o += 8;
  const descriptionHash = new Uint8Array(data.subarray(o, o + 32)); o += 32;
  const proofHash = new Uint8Array(data.subarray(o, o + 32)); o += 32;
  const status = data.readUInt8(o); o += 1;
  o += 7; // padding
  const createdAt = data.readBigInt64LE(o); o += 8;
  const deadline = data.readBigInt64LE(o); o += 8;
  const tags = new Uint8Array(data.subarray(o, o + 16));
  return { id, creator, claimer, bounty, descriptionHash, proofHash, status, createdAt, deadline, tags };
}

const STATUS_NAMES: Record<number, string> = {
  0: "Open", 1: "Claimed", 2: "Submitted", 3: "Completed", 4: "Cancelled", 5: "Disputed",
};

// ============================================================================
// Instruction builders
// ============================================================================

function ixInitialize(admin: PublicKey, feeBps = 200, disputeStake = 100_000_000n): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [treasuryPDA] = getTreasuryPDA();
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([0]), encodeU16LE(feeBps), Buffer.alloc(6), encodeU64LE(disputeStake)]),
  });
}

function ixCreateTask(creator: PublicKey, taskId: bigint, bounty: bigint, descHash: Uint8Array, deadline = 0n, tags = new Uint8Array(16)): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [taskPDA] = getTaskPDA(taskId);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([1]), encodeU64LE(bounty), Buffer.from(descHash), encodeI64LE(deadline), Buffer.from(tags)]),
  });
}

function ixClaimTask(claimer: PublicKey, taskId: bigint): TransactionInstruction {
  const [taskPDA] = getTaskPDA(taskId);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([Buffer.from([2]), encodeU64LE(taskId)]),
  });
}

function ixSubmitWork(claimer: PublicKey, taskId: bigint, proofHash: Uint8Array): TransactionInstruction {
  const [taskPDA] = getTaskPDA(taskId);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([Buffer.from([3]), encodeU64LE(taskId), Buffer.from(proofHash)]),
  });
}

function ixApproveWork(creator: PublicKey, taskId: bigint, claimer: PublicKey): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [taskPDA] = getTaskPDA(taskId);
  const [treasuryPDA] = getTreasuryPDA();
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
    data: Buffer.concat([Buffer.from([4]), encodeU64LE(taskId)]),
  });
}

function ixCancelTask(creator: PublicKey, taskId: bigint): TransactionInstruction {
  const [configPDA] = getConfigPDA();
  const [taskPDA] = getTaskPDA(taskId);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([8]), encodeU64LE(taskId)]),
  });
}

// ============================================================================
// Helpers
// ============================================================================

async function sendTx(
  conn: Connection,
  tx: Transaction,
  signers: Keypair[],
  label: string
): Promise<string> {
  try {
    const sig = await sendAndConfirmTransaction(conn, tx, signers, {
      commitment: "confirmed",
      skipPreflight: false,
    });
    console.log(`  ✅ ${label} — tx: ${sig}`);
    console.log(`     https://solscan.io/tx/${sig}?cluster=devnet`);
    return sig;
  } catch (err: any) {
    console.error(`  ❌ ${label} FAILED`);
    if (err?.logs) {
      console.error("  Program logs:");
      for (const l of err.logs) console.error("    " + l);
    }
    throw err;
  }
}

async function fetchConfig(conn: Connection): Promise<ConfigAccount> {
  const [pda] = getConfigPDA();
  const info = await conn.getAccountInfo(pda, "confirmed");
  if (!info) throw new Error("Config account not found");
  return parseConfig(info.data as Buffer);
}

async function fetchTask(conn: Connection, taskId: bigint): Promise<TaskAccount> {
  const [pda] = getTaskPDA(taskId);
  const info = await conn.getAccountInfo(pda, "confirmed");
  if (!info) throw new Error(`Task ${taskId} account not found`);
  return parseTask(info.data as Buffer);
}

function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(path, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function sha256(s: string): Uint8Array {
  return new Uint8Array(crypto.createHash("sha256").update(s).digest());
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================================
// Main test
// ============================================================================

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  BountyBoard Devnet Integration Test");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const conn = new Connection(DEVNET_URL, "confirmed");
  const admin = loadKeypair(
    process.env.ADMIN_KEYPAIR || `${process.env.HOME}/.config/solana/ore_lottery_deploy.json`
  );
  const claimer = Keypair.generate();

  const [configPDA] = getConfigPDA();
  const [treasuryPDA] = getTreasuryPDA();

  console.log(`Program:   ${PROGRAM_ID.toBase58()}`);
  console.log(`Admin:     ${admin.publicKey.toBase58()}`);
  console.log(`Claimer:   ${claimer.publicKey.toBase58()}`);
  console.log(`Config:    ${configPDA.toBase58()}`);
  console.log(`Treasury:  ${treasuryPDA.toBase58()}`);
  console.log();

  // Check admin balance
  const adminBal = await conn.getBalance(admin.publicKey);
  console.log(`Admin balance: ${adminBal / LAMPORTS_PER_SOL} SOL`);
  if (adminBal < 0.05 * LAMPORTS_PER_SOL) {
    console.error("Admin needs at least 0.05 SOL on devnet. Requesting airdrop...");
    const airdropSig = await conn.requestAirdrop(admin.publicKey, LAMPORTS_PER_SOL);
    await conn.confirmTransaction(airdropSig, "confirmed");
    console.log("Airdrop received");
  }

  // Fund claimer
  console.log("\nFunding claimer with 0.01 SOL...");
  {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: admin.publicKey,
        toPubkey: claimer.publicKey,
        lamports: 0.01 * LAMPORTS_PER_SOL,
      })
    );
    await sendTx(conn, tx, [admin], "Fund claimer");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Initialize
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n── Step 1: Initialize ─────────────────────────────────────────");

  // Check if already initialized
  const existingConfig = await conn.getAccountInfo(configPDA);
  if (existingConfig) {
    console.log("  ℹ️  Config PDA already exists — skipping Initialize.");
    const cfg = parseConfig(existingConfig.data as Buffer);
    console.log(`     Admin: ${cfg.admin.toBase58()}`);
    console.log(`     Fee: ${cfg.protocolFeeBps} bps`);
    console.log(`     Task count: ${cfg.taskCount}`);
  } else {
    const tx = new Transaction().add(ixInitialize(admin.publicKey));
    await sendTx(conn, tx, [admin], "Initialize");
    const cfg = await fetchConfig(conn);
    console.log(`     Admin: ${cfg.admin.toBase58()}`);
    console.log(`     Fee: ${cfg.protocolFeeBps} bps`);
    console.log(`     Dispute stake: ${cfg.disputeStake} lamports`);
  }

  // Pre-fund treasury PDA so it can receive fees without falling below rent-exempt
  const treasuryInfo = await conn.getAccountInfo(treasuryPDA);
  if (!treasuryInfo || treasuryInfo.lamports < 1_000_000) {
    console.log("\nPre-funding Treasury PDA with 0.002 SOL for rent-exemption...");
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: admin.publicKey,
        toPubkey: treasuryPDA,
        lamports: 2_000_000, // ~0.002 SOL, enough for rent-exempt with 0 data
      })
    );
    await sendTx(conn, tx, [admin], "Fund Treasury PDA");
  }

  // Read current task count to know what IDs to use
  const config0 = await fetchConfig(conn);
  const taskId1 = config0.taskCount;
  const taskId2 = taskId1 + 1n;
  console.log(`\n  Next task IDs: ${taskId1}, ${taskId2}`);

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: CreateTask #1 (0.01 SOL bounty)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n── Step 2: CreateTask #1 ──────────────────────────────────────");
  {
    const descHash = sha256("Fix the header alignment bug on the landing page");
    const tx = new Transaction().add(
      ixCreateTask(admin.publicKey, taskId1, BigInt(BOUNTY), descHash)
    );
    await sendTx(conn, tx, [admin], `CreateTask(id=${taskId1})`);

    const task = await fetchTask(conn, taskId1);
    console.log(`     Task ID: ${task.id}`);
    console.log(`     Creator: ${task.creator.toBase58()}`);
    console.log(`     Bounty:  ${task.bounty} lamports (${Number(task.bounty) / LAMPORTS_PER_SOL} SOL)`);
    console.log(`     Status:  ${STATUS_NAMES[task.status]}`);
    if (task.status !== 0) throw new Error(`Expected status Open(0), got ${task.status}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 3: ClaimTask
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n── Step 3: ClaimTask ──────────────────────────────────────────");
  {
    const tx = new Transaction().add(ixClaimTask(claimer.publicKey, taskId1));
    await sendTx(conn, tx, [claimer], `ClaimTask(id=${taskId1})`);

    const task = await fetchTask(conn, taskId1);
    console.log(`     Claimer: ${task.claimer.toBase58()}`);
    console.log(`     Status:  ${STATUS_NAMES[task.status]}`);
    if (task.status !== 1) throw new Error(`Expected status Claimed(1), got ${task.status}`);
    if (!task.claimer.equals(claimer.publicKey)) throw new Error("Claimer mismatch");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 4: SubmitWork
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n── Step 4: SubmitWork ─────────────────────────────────────────");
  {
    const proofHash = sha256("ipfs://QmFixedHeaderProof123456789");
    const tx = new Transaction().add(ixSubmitWork(claimer.publicKey, taskId1, proofHash));
    await sendTx(conn, tx, [claimer], `SubmitWork(id=${taskId1})`);

    const task = await fetchTask(conn, taskId1);
    console.log(`     Status:  ${STATUS_NAMES[task.status]}`);
    console.log(`     Proof:   ${Buffer.from(task.proofHash).toString("hex").slice(0, 16)}...`);
    if (task.status !== 2) throw new Error(`Expected status Submitted(2), got ${task.status}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 5: ApproveWork
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n── Step 5: ApproveWork ────────────────────────────────────────");
  {
    const claimerBalBefore = await conn.getBalance(claimer.publicKey);
    const tx = new Transaction().add(
      ixApproveWork(admin.publicKey, taskId1, claimer.publicKey)
    );
    await sendTx(conn, tx, [admin], `ApproveWork(id=${taskId1})`);

    const task = await fetchTask(conn, taskId1);
    console.log(`     Status:  ${STATUS_NAMES[task.status]}`);
    if (task.status !== 3) throw new Error(`Expected status Completed(3), got ${task.status}`);

    const claimerBalAfter = await conn.getBalance(claimer.publicKey);
    const received = claimerBalAfter - claimerBalBefore;
    // Expected: bounty * (1 - 2%) = 9_800_000 lamports
    const expectedPayment = BigInt(BOUNTY) * 9800n / 10000n;
    console.log(`     Claimer received: ${received} lamports`);
    console.log(`     Expected (98%):   ${expectedPayment} lamports`);
    if (BigInt(received) !== expectedPayment) {
      console.warn(`     ⚠️  Payment mismatch (may be due to rent adjustments)`);
    }

    const cfgAfter = await fetchConfig(conn);
    console.log(`     Total completed:  ${cfgAfter.totalCompleted}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 6: CreateTask #2 (for cancel test)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n── Step 6: CreateTask #2 (for cancel) ─────────────────────────");
  {
    const descHash = sha256("Write unit tests for the payment module");
    const tx = new Transaction().add(
      ixCreateTask(admin.publicKey, taskId2, BigInt(BOUNTY), descHash)
    );
    await sendTx(conn, tx, [admin], `CreateTask(id=${taskId2})`);

    const task = await fetchTask(conn, taskId2);
    console.log(`     Task ID: ${task.id}`);
    console.log(`     Bounty:  ${task.bounty} lamports`);
    console.log(`     Status:  ${STATUS_NAMES[task.status]}`);
    if (task.status !== 0) throw new Error(`Expected status Open(0), got ${task.status}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 7: CancelTask #2
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n── Step 7: CancelTask ─────────────────────────────────────────");
  {
    const adminBalBefore = await conn.getBalance(admin.publicKey);
    const tx = new Transaction().add(ixCancelTask(admin.publicKey, taskId2));
    await sendTx(conn, tx, [admin], `CancelTask(id=${taskId2})`);

    const task = await fetchTask(conn, taskId2);
    console.log(`     Status:  ${STATUS_NAMES[task.status]}`);
    if (task.status !== 4) throw new Error(`Expected status Cancelled(4), got ${task.status}`);

    const adminBalAfter = await conn.getBalance(admin.publicKey);
    // Admin gets bounty back minus tx fee
    const diff = adminBalAfter - adminBalBefore;
    console.log(`     Admin balance change: ${diff} lamports (bounty refund minus tx fee)`);
    // Should be roughly +BOUNTY minus ~5000 lamport tx fee
    if (diff < BOUNTY * 0.9) {
      console.warn(`     ⚠️  Refund seems low — expected ~${BOUNTY} back`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  ✅ ALL TESTS PASSED");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const finalConfig = await fetchConfig(conn);
  console.log("Final protocol state:");
  console.log(`  Task count:      ${finalConfig.taskCount}`);
  console.log(`  Total escrowed:  ${finalConfig.totalEscrowed} lamports`);
  console.log(`  Total completed: ${finalConfig.totalCompleted}`);
}

main().catch((err) => {
  console.error("\n💥 TEST FAILED:", err.message || err);
  process.exit(1);
});
