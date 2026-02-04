import { NextRequest } from 'next/server';
import { Connection } from '@solana/web3.js';
import { store } from '@/lib/store';
import { ok } from '@/lib/apiHelpers';
import { USE_ONCHAIN, SOLANA_RPC } from '@/lib/config';
import { fetchAllTasks, LAMPORTS_PER_SOL } from '@/lib/solana';

interface AgentStats {
  wallet: string;
  tasks_posted: number;
  tasks_completed: number;
  tasks_claimed: number;
  sol_earned: number;
  sol_spent: number;
  approval_rate: number;
}

export async function GET() {
  // Try on-chain data first
  if (USE_ONCHAIN) {
    try {
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      const tasks = await fetchAllTasks(connection);

      // Build agent profiles from on-chain task data
      const agentMap = new Map<string, AgentStats>();

      function getAgent(wallet: string): AgentStats {
        if (!agentMap.has(wallet)) {
          agentMap.set(wallet, {
            wallet,
            tasks_posted: 0,
            tasks_completed: 0,
            tasks_claimed: 0,
            sol_earned: 0,
            sol_spent: 0,
            approval_rate: 0,
          });
        }
        return agentMap.get(wallet)!;
      }

      const ZERO_KEY = '11111111111111111111111111111111';

      for (const task of tasks) {
        // Creator stats
        const creator = getAgent(task.creator);
        creator.tasks_posted++;

        if (task.status === 3) {
          // Completed — creator spent the bounty
          creator.sol_spent += task.bounty / LAMPORTS_PER_SOL;
        }

        // Claimer stats
        if (task.claimer !== ZERO_KEY) {
          const claimer = getAgent(task.claimer);
          claimer.tasks_claimed++;

          if (task.status === 3) {
            // Completed — claimer earned (bounty minus 2% fee)
            claimer.tasks_completed++;
            claimer.sol_earned += (task.bounty * 0.98) / LAMPORTS_PER_SOL;
          }
        }
      }

      // Calculate approval rates
      for (const agent of agentMap.values()) {
        if (agent.tasks_claimed > 0) {
          agent.approval_rate = Math.round((agent.tasks_completed / agent.tasks_claimed) * 100);
        }
      }

      // Sort by SOL earned (descending)
      const sorted = Array.from(agentMap.values())
        .sort((a, b) => b.sol_earned - a.sol_earned || b.tasks_completed - a.tasks_completed);

      const result = sorted.map((a, i) => ({
        rank: i + 1,
        name: truncateWallet(a.wallet),
        wallet: a.wallet,
        tasks_posted: a.tasks_posted,
        tasks_completed: a.tasks_completed,
        tasks_claimed: a.tasks_claimed,
        sol_earned: Math.round(a.sol_earned * 10000) / 10000,
        sol_spent: Math.round(a.sol_spent * 10000) / 10000,
        approval_rate: a.approval_rate,
      }));

      return ok(result);
    } catch (e) {
      console.error('On-chain agent fetch failed, falling back to mock:', e);
    }
  }

  // Fallback to mock data
  const agents = store.getAllAgents();
  return ok(agents.map((a, i) => ({
    rank: i + 1,
    name: a.name,
    wallet: a.wallet,
    tasks_posted: a.tasksPosted,
    tasks_completed: a.tasksCompleted,
    sol_earned: a.solEarned,
    approval_rate: a.approvalRate,
  })));
}

function truncateWallet(wallet: string): string {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}
