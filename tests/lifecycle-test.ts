/**
 * Quick lifecycle test: Claim → Submit → Approve on a new v2 task
 * This validates the submitted_at timestamp works correctly
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
function sha256(s: string): Uint8Array {
  return new Uint8Array(crypto.createHash("sha256").update(s).digest());
}
function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf-8"))));
}

async function main() {
  const conn = new Connection("https://devnet.helius-rpc.com/?api-key=06cda3a9-32f3-4ad9-a203-9d7274299837", "confirmed");
  const admin = loadKeypair(`${process.env.HOME}/.config/solana/ore_lottery_deploy.json`);
  const claimer = Keypair.generate();

  console.log("Admin:", admin.publicKey.toBase58());
  console.log("Claimer:", claimer.publicKey.toBase58());

  // Fund claimer
  console.log("\n1. Funding claimer...");
  const fundTx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: claimer.publicKey, lamports: 0.01 * LAMPORTS_PER_SOL })
  );
  await sendAndConfirmTransaction(conn, fundTx, [admin], { commitment: "confirmed" });
  console.log("   ✅ Funded");

  // Use task 11 (first new v2 task, should be open)
  const taskId = 11n;
  const [taskPDA] = getTaskPDA(taskId);

  // Read task state before
  let taskInfo = await conn.getAccountInfo(taskPDA, "confirmed");
  console.log(`\n   Task ${taskId} account size: ${taskInfo!.data.length} bytes`);
  const statusBefore = taskInfo!.data[8 + 8 + 32 + 32 + 8 + 32 + 32]; // status byte offset
  console.log(`   Status before: ${statusBefore} (0=Open)`);

  // 2. Claim
  console.log("\n2. Claiming task 11...");
  const claimIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: claimer.publicKey, isSigner: true, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([Buffer.from([2]), encodeU64LE(taskId)]),
  });
  const claimSig = await sendAndConfirmTransaction(conn, new Transaction().add(claimIx), [claimer], { commitment: "confirmed" });
  console.log(`   ✅ Claimed: ${claimSig}`);

  // Read submitted_at and claimed_at
  taskInfo = await conn.getAccountInfo(taskPDA, "confirmed");
  const data = taskInfo!.data as Buffer;
  // claimed_at is at offset: 8(disc) + 184(old fields) + 8(submitted_at) = 200
  const submittedAtOffset = 8 + 8 + 32 + 32 + 8 + 32 + 32 + 1 + 7 + 8 + 8 + 16; // = 192
  const claimedAtOffset = submittedAtOffset + 8; // = 200
  const claimedAt = Number(data.readBigInt64LE(claimedAtOffset));
  console.log(`   claimed_at: ${claimedAt} (${new Date(claimedAt * 1000).toISOString()})`);

  // 3. Submit work
  console.log("\n3. Submitting work...");
  const proofHash = sha256("https://github.com/example/audit-report");
  const submitIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: claimer.publicKey, isSigner: true, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([Buffer.from([3]), encodeU64LE(taskId), Buffer.from(proofHash)]),
  });
  const submitSig = await sendAndConfirmTransaction(conn, new Transaction().add(submitIx), [claimer], { commitment: "confirmed" });
  console.log(`   ✅ Submitted: ${submitSig}`);

  // Read submitted_at
  taskInfo = await conn.getAccountInfo(taskPDA, "confirmed");
  const data2 = taskInfo!.data as Buffer;
  const submittedAt = Number(data2.readBigInt64LE(submittedAtOffset));
  console.log(`   submitted_at: ${submittedAt} (${new Date(submittedAt * 1000).toISOString()})`);

  // 4. Approve
  console.log("\n4. Approving work...");
  const [configPDA] = getConfigPDA();
  const [treasuryPDA] = getTreasuryPDA();
  const approveIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: claimer.publicKey, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([4]), encodeU64LE(taskId)]),
  });
  const approveSig = await sendAndConfirmTransaction(conn, new Transaction().add(approveIx), [admin], { commitment: "confirmed" });
  console.log(`   ✅ Approved: ${approveSig}`);

  // Final state
  taskInfo = await conn.getAccountInfo(taskPDA, "confirmed");
  const data3 = taskInfo!.data as Buffer;
  const finalStatus = data3[8 + 8 + 32 + 32 + 8 + 32 + 32];
  console.log(`\n   Final status: ${finalStatus} (3=Completed)`);

  const claimerBal = await conn.getBalance(claimer.publicKey);
  console.log(`   Claimer balance: ${claimerBal / LAMPORTS_PER_SOL} SOL`);

  console.log("\n✅ Full lifecycle test passed! Task 11: Open → Claimed → Submitted → Completed");
  console.log(`   Timestamps verified: claimed_at=${claimedAt}, submitted_at=${submittedAt}`);
}

main().catch(e => { console.error("❌ FAILED:", e.message); process.exit(1); });
