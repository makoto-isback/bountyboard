import { PublicKey } from "@solana/web3.js";

export enum BountyBoardInstruction {
  Initialize = 0,
  CreateTask = 1,
  ClaimTask = 2,
  SubmitWork = 3,
  ApproveWork = 4,
  RejectWork = 5,
  Dispute = 6,
  ResolveDispute = 7,
  CancelTask = 8,
}

export enum TaskStatus {
  Open = 0,
  Claimed = 1,
  Submitted = 2,
  Completed = 3,
  Cancelled = 4,
  Disputed = 5,
}

export interface ConfigAccount {
  admin: PublicKey;
  protocolFeeBps: number;
  treasury: PublicKey;
  taskCount: bigint;
  totalEscrowed: bigint;
  totalCompleted: bigint;
  disputeStake: bigint;
}

export interface TaskAccount {
  id: bigint;
  creator: PublicKey;
  claimer: PublicKey;
  bounty: bigint;
  descriptionHash: Uint8Array;
  proofHash: Uint8Array;
  status: TaskStatus;
  createdAt: bigint;
  deadline: bigint;
  tags: Uint8Array;
}
