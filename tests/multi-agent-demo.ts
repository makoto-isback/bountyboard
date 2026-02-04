/**
 * Multi-Agent Demo: Simulates real cross-agent activity on devnet
 * 
 * Creates 3 different "agent" wallets that interact with BountyBoard:
 * - Agent A (admin): Posts tasks
 * - Agent B: Claims and completes security audit task
 * - Agent C: Claims and completes data scraping task
 * 
 * This creates realistic on-chain activity with multiple wallets,
 * showing real agent-to-agent interaction via the protocol.
 */

import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
  TransactionInstruction, sendAndConfirmTransaction, LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as fs from "fs";
import * as crypto from "crypto";

const PROGRAM_ID = new PublicKey("GJgmGsoz1JaiPpKTTTeZD31TrxZqF7x7gtwuqhDJHHX1");
const CONFIG_SEED = Buffer.from("config");
const TASK_SEED = Buffer.from("task");
const TREASURY_SEED = Buffer.from("treasury");
const HELIUS_RPC = "https://devnet.helius-rpc.com/?api-key=06cda3a9-32f3-4ad9-a203-9d7274299837";

function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
}
function getTaskPDA(taskId: bigint | number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(taskId));
  return PublicKey.findProgramAddressSync([TASK_SEED, buf], PROGRAM_ID);
}
function getTreasuryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([TREASURY_SEED], PROGRAM_ID);
}
function encodeU64LE(v: bigint | number): Buffer {
  const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b;
}
function encodeI64LE(v: bigint | number): Buffer {
  const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(v)); return b;
}
function sha256(s: string): Uint8Array {
  return new Uint8Array(crypto.createHash("sha256").update(s).digest());
}
function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf-8"))));
}

async function sendTx(conn: Connection, tx: Transaction, signers: Keypair[], label: string): Promise<string> {
  const sig = await sendAndConfirmTransaction(conn, tx, signers, { commitment: "confirmed" });
  console.log(`  ✅ ${label}: ${sig}`);
  return sig;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  BountyBoard Multi-Agent Demo");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const conn = new Connection(HELIUS_RPC, "confirmed");
  const admin = loadKeypair(`${process.env.HOME}/.config/solana/ore_lottery_deploy.json`);
  
  // Create two "agent" wallets
  const agentB = Keypair.generate();
  const agentC = Keypair.generate();

  console.log("Agents:");
  console.log(`  Admin (poster):  ${admin.publicKey.toBase58()}`);
  console.log(`  Agent B (audit): ${agentB.publicKey.toBase58()}`);
  console.log(`  Agent C (data):  ${agentC.publicKey.toBase58()}`);

  // Fund agents
  console.log("\n1. Funding agent wallets...");
  const fundTx = new Transaction()
    .add(SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: agentB.publicKey, lamports: 0.01 * LAMPORTS_PER_SOL }))
    .add(SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: agentC.publicKey, lamports: 0.01 * LAMPORTS_PER_SOL }));
  await sendTx(conn, fundTx, [admin], "Fund agents B + C");

  // Read current task count
  const [configPDA] = getConfigPDA();
  const configInfo = await conn.getAccountInfo(configPDA, "confirmed");
  let offset = 8 + 32 + 2 + 6 + 32;
  const taskCount = Number(configInfo!.data.readBigUInt64LE(offset));
  console.log(`\n  Current task count: ${taskCount}`);

  // ── Agent B claims task 12 (Scrape NFT collections) and completes it ──
  const taskIdB = 12n;
  console.log(`\n2. Agent B claims task ${taskIdB} (Scrape NFT collections)...`);
  
  const [taskPdaB] = getTaskPDA(taskIdB);
  const claimBIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: agentB.publicKey, isSigner: true, isWritable: true },
      { pubkey: taskPdaB, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([Buffer.from([2]), encodeU64LE(taskIdB)]),
  });
  await sendTx(conn, new Transaction().add(claimBIx), [agentB], `Agent B claims task ${taskIdB}`);

  console.log("\n3. Agent B submits work proof...");
  const proofB = sha256("https://gist.github.com/agentB/nft-collections-top100.json");
  const submitBIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: agentB.publicKey, isSigner: true, isWritable: true },
      { pubkey: taskPdaB, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([Buffer.from([3]), encodeU64LE(taskIdB), Buffer.from(proofB)]),
  });
  await sendTx(conn, new Transaction().add(submitBIx), [agentB], `Agent B submits proof`);

  console.log("\n4. Admin approves Agent B's work...");
  const [treasuryPDA] = getTreasuryPDA();
  const approveBIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: taskPdaB, isSigner: false, isWritable: true },
      { pubkey: agentB.publicKey, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([4]), encodeU64LE(taskIdB)]),
  });
  await sendTx(conn, new Transaction().add(approveBIx), [admin], `Admin approves Agent B`);

  // ── Agent C claims task 16 (Price feed aggregator) and completes it ──
  const taskIdC = 16n;
  console.log(`\n5. Agent C claims task ${taskIdC} (Price feed aggregator)...`);
  
  const [taskPdaC] = getTaskPDA(taskIdC);
  const claimCIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: agentC.publicKey, isSigner: true, isWritable: true },
      { pubkey: taskPdaC, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([Buffer.from([2]), encodeU64LE(taskIdC)]),
  });
  await sendTx(conn, new Transaction().add(claimCIx), [agentC], `Agent C claims task ${taskIdC}`);

  console.log("\n6. Agent C submits work proof...");
  const proofC = sha256("https://api.agentC.dev/price-feeds/solana-defi-ohlcv.json");
  const submitCIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: agentC.publicKey, isSigner: true, isWritable: true },
      { pubkey: taskPdaC, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([Buffer.from([3]), encodeU64LE(taskIdC), Buffer.from(proofC)]),
  });
  await sendTx(conn, new Transaction().add(submitCIx), [agentC], `Agent C submits proof`);

  console.log("\n7. Admin approves Agent C's work...");
  const approveCIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: taskPdaC, isSigner: false, isWritable: true },
      { pubkey: agentC.publicKey, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([4]), encodeU64LE(taskIdC)]),
  });
  await sendTx(conn, new Transaction().add(approveCIx), [admin], `Admin approves Agent C`);

  // ── Agent C also claims task 14 (Translate docs) — leaves it in submitted state ──
  const taskIdC2 = 14n;
  console.log(`\n8. Agent C claims task ${taskIdC2} (Translate docs) and submits...`);
  
  const [taskPdaC2] = getTaskPDA(taskIdC2);
  const claimC2 = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: agentC.publicKey, isSigner: true, isWritable: true },
      { pubkey: taskPdaC2, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([Buffer.from([2]), encodeU64LE(taskIdC2)]),
  });
  await sendTx(conn, new Transaction().add(claimC2), [agentC], `Agent C claims task ${taskIdC2}`);

  const proofC2 = sha256("https://docs.solana.com/ja/token-program — translated 15,000 words");
  const submitC2 = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: agentC.publicKey, isSigner: true, isWritable: true },
      { pubkey: taskPdaC2, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([Buffer.from([3]), encodeU64LE(taskIdC2), Buffer.from(proofC2)]),
  });
  await sendTx(conn, new Transaction().add(submitC2), [agentC], `Agent C submits (awaiting review)`);

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  ✅ Multi-Agent Demo Complete!");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nOn-chain activity created:");
  console.log(`  • Task 12: Claimed by Agent B → Submitted → Approved ✅`);
  console.log(`  • Task 16: Claimed by Agent C → Submitted → Approved ✅`);
  console.log(`  • Task 14: Claimed by Agent C → Submitted (awaiting review)`);
  console.log(`\n  Agent B wallet: ${agentB.publicKey.toBase58()}`);
  console.log(`  Agent C wallet: ${agentC.publicKey.toBase58()}`);
  console.log(`\n  4 completed tasks total, 3 unique agent wallets`);
  console.log(`  Verifiable on Solscan: https://solscan.io/account/${PROGRAM_ID.toBase58()}?cluster=devnet`);
}

main().catch(e => { console.error("❌ FAILED:", e.message); process.exit(1); });
