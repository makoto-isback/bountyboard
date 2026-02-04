/**
 * On-chain data reader for BountyBoard program
 *
 * Reads Config and Task accounts directly from devnet using exact byte layouts
 * matching the Rust structs (with Steel's 8-byte discriminator prefix).
 */

import { Connection, PublicKey } from "@solana/web3.js";

const PROGRAM_ID_STR =
  process.env.NEXT_PUBLIC_PROGRAM_ID || "GJgmGsoz1JaiPpKTTTeZD31TrxZqF7x7gtwuqhDJHHX1";
const PROGRAM_ID = new PublicKey(PROGRAM_ID_STR);

const CONFIG_SEED = Buffer.from("config");
const TASK_SEED = Buffer.from("task");
const DISCRIMINATOR_SIZE = 8;

// ============================================================================
// Types
// ============================================================================

export interface Config {
  admin: string;
  protocolFeeBps: number;
  treasury: string;
  taskCount: number;
  totalEscrowed: number; // lamports
  totalCompleted: number;
  disputeStake: number; // lamports
}

export interface OnChainTask {
  id: number;
  creator: string;
  claimer: string;
  bounty: number; // lamports
  descriptionHash: string; // hex
  proofHash: string; // hex
  status: number; // 0=Open, 1=Claimed, 2=Submitted, 3=Completed, 4=Cancelled, 5=Disputed
  createdAt: number; // unix timestamp
  deadline: number; // unix timestamp (0 = no deadline)
  tags: Uint8Array;
  submittedAt: number; // unix timestamp (0 = not submitted)
  claimedAt: number; // unix timestamp (0 = not claimed)
}

const STATUS_MAP: Record<number, string> = {
  0: "open",
  1: "claimed",
  2: "submitted",
  3: "completed",
  4: "cancelled",
  5: "disputed",
};

export function statusToString(status: number): string {
  return STATUS_MAP[status] || "unknown";
}

// ============================================================================
// PDA derivation
// ============================================================================

export function getConfigPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
  return pda;
}

export function getTaskPDA(taskId: number): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(taskId));
  const [pda] = PublicKey.findProgramAddressSync([TASK_SEED, buf], PROGRAM_ID);
  return pda;
}

// ============================================================================
// Parsers
// ============================================================================

/**
 * Config account layout (after 8-byte discriminator):
 *   admin:            Pubkey  (32)
 *   protocol_fee_bps: u16     (2)
 *   _padding:         [u8;6]  (6)
 *   treasury:         Pubkey  (32)
 *   task_count:       u64     (8)
 *   total_escrowed:   u64     (8)
 *   total_completed:  u64     (8)
 *   dispute_stake:    u64     (8)
 *   Total: 8 + 104 = 112 bytes
 */
function parseConfig(data: Buffer): Config {
  let o = DISCRIMINATOR_SIZE;
  const admin = new PublicKey(data.subarray(o, o + 32)).toBase58();
  o += 32;
  const protocolFeeBps = data.readUInt16LE(o);
  o += 2;
  o += 6; // padding
  const treasury = new PublicKey(data.subarray(o, o + 32)).toBase58();
  o += 32;
  const taskCount = Number(data.readBigUInt64LE(o));
  o += 8;
  const totalEscrowed = Number(data.readBigUInt64LE(o));
  o += 8;
  const totalCompleted = Number(data.readBigUInt64LE(o));
  o += 8;
  const disputeStake = Number(data.readBigUInt64LE(o));
  return { admin, protocolFeeBps, treasury, taskCount, totalEscrowed, totalCompleted, disputeStake };
}

/**
 * Task account layout (after 8-byte discriminator):
 *   id:               u64       (8)
 *   creator:          Pubkey    (32)
 *   claimer:          Pubkey    (32)
 *   bounty:           u64       (8)
 *   description_hash: [u8;32]   (32)
 *   proof_hash:       [u8;32]   (32)
 *   status:           u8        (1)
 *   _padding:         [u8;7]    (7)
 *   created_at:       i64       (8)
 *   deadline:         i64       (8)
 *   tags:             [u8;16]   (16)
 *   submitted_at:     i64       (8)
 *   claimed_at:       i64       (8)
 *   Total: 8 + 200 = 208 bytes
 */
function parseTask(data: Buffer): OnChainTask {
  let o = DISCRIMINATOR_SIZE;
  const id = Number(data.readBigUInt64LE(o));
  o += 8;
  const creator = new PublicKey(data.subarray(o, o + 32)).toBase58();
  o += 32;
  const claimer = new PublicKey(data.subarray(o, o + 32)).toBase58();
  o += 32;
  const bounty = Number(data.readBigUInt64LE(o));
  o += 8;
  const descriptionHash = Buffer.from(data.subarray(o, o + 32)).toString("hex");
  o += 32;
  const proofHash = Buffer.from(data.subarray(o, o + 32)).toString("hex");
  o += 32;
  const status = data.readUInt8(o);
  o += 1;
  o += 7; // padding
  const createdAt = Number(data.readBigInt64LE(o));
  o += 8;
  const deadline = Number(data.readBigInt64LE(o));
  o += 8;
  const tags = new Uint8Array(data.subarray(o, o + 16));
  o += 16;

  // v2 fields (optional — old 192-byte accounts won't have these)
  let submittedAt = 0;
  let claimedAt = 0;
  if (data.length >= o + 16) {
    submittedAt = Number(data.readBigInt64LE(o));
    o += 8;
    claimedAt = Number(data.readBigInt64LE(o));
  }

  return { id, creator, claimer, bounty, descriptionHash, proofHash, status, createdAt, deadline, tags, submittedAt, claimedAt };
}

// ============================================================================
// Fetch functions
// ============================================================================

export async function fetchConfig(connection: Connection): Promise<Config> {
  const pda = getConfigPDA();
  const info = await connection.getAccountInfo(pda, "confirmed");
  if (!info) throw new Error("Config account not found");
  return parseConfig(info.data as Buffer);
}

export async function fetchAllTasks(connection: Connection): Promise<OnChainTask[]> {
  // Fetch both old (192 bytes) and new (208 bytes) task accounts
  const OLD_TASK_SIZE = DISCRIMINATOR_SIZE + 184; // 192 (v1 without timestamps)
  const NEW_TASK_SIZE = DISCRIMINATOR_SIZE + 200; // 208 (v2 with submitted_at + claimed_at)

  const [oldAccounts, newAccounts] = await Promise.all([
    connection.getProgramAccounts(PROGRAM_ID, {
      commitment: "confirmed",
      filters: [{ dataSize: OLD_TASK_SIZE }],
    }),
    connection.getProgramAccounts(PROGRAM_ID, {
      commitment: "confirmed",
      filters: [{ dataSize: NEW_TASK_SIZE }],
    }),
  ]);

  const accounts = [...oldAccounts, ...newAccounts];

  return accounts
    .map((a) => parseTask(a.account.data as Buffer))
    .sort((a, b) => b.id - a.id); // newest first
}

export async function fetchTask(connection: Connection, taskId: number): Promise<OnChainTask> {
  const pda = getTaskPDA(taskId);
  const info = await connection.getAccountInfo(pda, "confirmed");
  if (!info) throw new Error(`Task ${taskId} not found`);
  return parseTask(info.data as Buffer);
}

// ============================================================================
// Helpers for frontend display
// ============================================================================

const LAMPORTS_PER_SOL = 1_000_000_000;

/** Known task descriptions mapped by SHA256 hash for display */
const TASK_TITLES: Record<string, string> = {
  "cb071f192d8ef52e1dff1715a2238b0def67821f60ecf3ba821e7a130461c2fd": "Fix the header alignment bug",
  "5d303a72ff6148f593a5272c6d807a2feca4850c945dd84ce8730fbeedc71171": "Write unit tests for payment module",
  "670a0579683f4c47f00893628c4bacefab155aecb9f7805992d2d82038fe1656": "Audit a Solana Anchor program for common vulnerabilities",
  "71a890edd434e7d41d590070218ccc7360d03cb165b6b9731fe4fb01b5e0fa24": "Scrape top 100 Solana NFT collections from Magic Eden",
  "b2eaa0fb3c8a154c31dcff3da34941d90cfe3eaa5d006ab4018e70740f33ffed": "Build a React component for wallet connection",
  "0ecb06093a630f25401fdfe579e066a9fd36194a4b3470b24e5fd27a82f68444": "Translate Solana documentation to Japanese",
  "59785f651556e992110d695fa3ee18d023cc65e4d0e24b2d720fd7b10e5c1fea": "Write integration tests for a token swap program",
  "4dd69fb36ce1c412b02b1ff7044128a5e443968a4f7ffba41c6cdef088fd576e": "Create a price feed aggregator for Solana DeFi tokens",
  "5e703830ba3bea0f1d050ea50865eb9fba6c838d10efe56ebf6dd24cfe0d156f": "Design a database schema for NFT marketplace",
  "44ddbcb21f72c621a908d863b37d598e5eae7e19c5f36b4c6e6993d1be1982ee": "Monitor whale wallet transactions on Solana for 24 hours",
};

/**
 * Convert an on-chain task to the frontend Task format
 */
export function onChainTaskToFrontend(task: OnChainTask): {
  id: string;
  title: string;
  description: string;
  bounty: number;
  status: string;
  poster: string;
  claimer: string | null;
  tags: string[];
  created_at: string;
  deadline_hours: number;
  proof: string | null;
  tx_signature: string | null;
  pda_address: string;
} {
  const isZeroKey = task.claimer === "11111111111111111111111111111111";
  const isZeroProof = task.proofHash === "0".repeat(64);

  // Derive deadline hours from timestamps
  let deadlineHours = 0;
  if (task.deadline > 0 && task.createdAt > 0) {
    deadlineHours = Math.round((task.deadline - task.createdAt) / 3600);
  }

  return {
    id: String(task.id),
    title: TASK_TITLES[task.descriptionHash] || `Task #${task.id}`,
    description: `On-chain task #${task.id} (hash: ${task.descriptionHash.slice(0, 16)}...)`,
    bounty: task.bounty / LAMPORTS_PER_SOL,
    status: statusToString(task.status),
    poster: task.creator.slice(0, 4) + "..." + task.creator.slice(-4),
    claimer: isZeroKey ? null : task.claimer.slice(0, 4) + "..." + task.claimer.slice(-4),
    tags: decodeTags(task.tags),
    created_at: new Date(task.createdAt * 1000).toISOString(),
    deadline_hours: deadlineHours,
    proof: isZeroProof ? null : task.proofHash,
    tx_signature: null,
    pda_address: getTaskPDA(task.id).toBase58(),
  };
}

/** Decode compact tag bytes to human-readable tags */
function decodeTags(tags: Uint8Array): string[] {
  // If tags are all zeros, return default
  if (tags.every((b) => b === 0)) return ["general"];

  // Try to decode as UTF-8 string (tags may be stored as short strings)
  const str = Buffer.from(tags).toString("utf-8").replace(/\0/g, "").trim();
  if (str.length > 0) return [str];
  return ["general"];
}

export { PROGRAM_ID, LAMPORTS_PER_SOL };
