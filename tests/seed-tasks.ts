/**
 * Seed 8 realistic tasks on devnet for BountyBoard
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

const PROGRAM_ID = new PublicKey("GJgmGsoz1JaiPpKTTTeZD31TrxZqF7x7gtwuqhDJHHX1");
const CONFIG_SEED = Buffer.from("config");
const TASK_SEED = Buffer.from("task");

function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
}

function getTaskPDA(taskId: bigint | number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(taskId));
  return PublicKey.findProgramAddressSync([TASK_SEED, buf], PROGRAM_ID);
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

function sha256(s: string): Uint8Array {
  return new Uint8Array(crypto.createHash("sha256").update(s).digest());
}

function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(path, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function ixCreateTask(
  creator: PublicKey,
  taskId: bigint,
  bounty: bigint,
  descHash: Uint8Array,
  deadline = 0n,
  tags = new Uint8Array(16)
): TransactionInstruction {
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
    data: Buffer.concat([
      Buffer.from([1]),
      encodeU64LE(bounty),
      Buffer.from(descHash),
      encodeI64LE(deadline),
      Buffer.from(tags),
    ]),
  });
}

interface TaskDef {
  title: string;
  description: string;
  bounty: number; // in SOL
}

const TASKS: TaskDef[] = [
  {
    title: "Audit a Solana Anchor program for common vulnerabilities",
    description:
      "Audit a Solana Anchor program for common vulnerabilities. Review for missing signer checks, PDA seed collisions, integer overflow, unchecked account ownership, and reentrancy. Provide structured report with severity ratings.",
    bounty: 0.05,
  },
  {
    title: "Scrape top 100 Solana NFT collections from Magic Eden",
    description:
      "Scrape top 100 Solana NFT collections from Magic Eden. Collect name, floor price, 24h volume, holder count, and listing count. Return as structured JSON with timestamps.",
    bounty: 0.02,
  },
  {
    title: "Build a React component for wallet connection",
    description:
      "Build a React component for Solana wallet connection. Support Phantom, Solflare, and Backpack. Include connect/disconnect, balance display, and address truncation. TypeScript + Tailwind.",
    bounty: 0.04,
  },
  {
    title: "Translate Solana documentation to Japanese",
    description:
      "Translate Solana documentation to Japanese. Cover Token Program, Token-2022, and Memo program docs. Maintain technical accuracy and consistent terminology. ~15,000 words.",
    bounty: 0.015,
  },
  {
    title: "Write integration tests for a token swap program",
    description:
      "Write integration tests for a token swap program using solana-program-test. Cover happy path, edge cases, and error conditions. Target >90% code coverage. Include CI config.",
    bounty: 0.03,
  },
  {
    title: "Create a price feed aggregator for Solana DeFi tokens",
    description:
      "Create a price feed aggregator for Solana DeFi tokens. Pull from Jupiter, Raydium, and Orca. Output OHLCV in 1m/5m/1h intervals for top 50 tokens. Handle rate limits.",
    bounty: 0.05,
  },
  {
    title: "Design a database schema for NFT marketplace",
    description:
      "Design a database schema for an NFT marketplace. Cover collections, listings, bids, sales history, user profiles, and royalty tracking. Provide ERD and SQL migrations.",
    bounty: 0.02,
  },
  {
    title: "Monitor whale wallet transactions on Solana for 24 hours",
    description:
      "Monitor whale wallet transactions on Solana for 24 hours. Track 20 known whale wallets. Alert on transactions >100 SOL or >$10k SPL tokens. Provide summary report with webhook integration.",
    bounty: 0.025,
  },
];

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  BountyBoard — Seeding 8 Tasks on Devnet");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const admin = loadKeypair(
    process.env.ADMIN_KEYPAIR || `${process.env.HOME}/.config/solana/ore_lottery_deploy.json`
  );

  console.log(`Program:  ${PROGRAM_ID.toBase58()}`);
  console.log(`Admin:    ${admin.publicKey.toBase58()}`);

  const adminBal = await conn.getBalance(admin.publicKey);
  console.log(`Balance:  ${adminBal / LAMPORTS_PER_SOL} SOL\n`);

  // Read current task count
  const [configPDA] = getConfigPDA();
  const configInfo = await conn.getAccountInfo(configPDA, "confirmed");
  if (!configInfo) throw new Error("Config not initialized! Run devnet-test.ts first.");

  let offset = 8 + 32 + 2 + 6 + 32; // disc + admin + fee + padding + treasury
  const currentTaskCount = Number(configInfo.data.readBigUInt64LE(offset));
  console.log(`Current task count: ${currentTaskCount}`);
  console.log(`Will create tasks ${currentTaskCount} through ${currentTaskCount + 7}\n`);

  const signatures: string[] = [];

  for (let i = 0; i < TASKS.length; i++) {
    const task = TASKS[i];
    const taskId = BigInt(currentTaskCount + i);
    const bountyLamports = BigInt(Math.round(task.bounty * LAMPORTS_PER_SOL));
    const descHash = sha256(task.description);

    console.log(`[${i + 1}/8] "${task.title}"`);
    console.log(`       Bounty: ${task.bounty} SOL | Task ID: ${taskId}`);

    const ix = ixCreateTask(admin.publicKey, taskId, bountyLamports, descHash);
    const tx = new Transaction().add(ix);

    try {
      const sig = await sendAndConfirmTransaction(conn, tx, [admin], {
        commitment: "confirmed",
        skipPreflight: false,
      });
      signatures.push(sig);
      console.log(`       ✅ tx: ${sig}`);
      console.log(`       https://solscan.io/tx/${sig}?cluster=devnet\n`);
    } catch (err: any) {
      console.error(`       ❌ FAILED`);
      if (err?.logs) {
        for (const l of err.logs) console.error("       " + l);
      }
      throw err;
    }

    // Small delay to avoid rate limiting
    if (i < TASKS.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ✅ ALL 8 TASKS SEEDED SUCCESSFULLY");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("Transaction signatures:");
  signatures.forEach((sig, i) => {
    console.log(`  ${i + 1}. ${sig}`);
  });
}

main().catch((err) => {
  console.error("\n💥 SEEDING FAILED:", err.message || err);
  process.exit(1);
});
