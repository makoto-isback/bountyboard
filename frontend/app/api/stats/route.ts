import { Connection } from '@solana/web3.js';
import { store } from '@/lib/store';
import { ok } from '@/lib/apiHelpers';
import { USE_ONCHAIN, SOLANA_RPC } from '@/lib/config';
import { fetchConfig, fetchAllTasks } from '@/lib/solana';

const LAMPORTS_PER_SOL = 1_000_000_000;

export async function GET() {
  if (USE_ONCHAIN) {
    try {
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      const [config, tasks] = await Promise.all([
        fetchConfig(connection),
        fetchAllTasks(connection),
      ]);

      const openTasks = tasks.filter(t => t.status === 0).length;
      const activeTasks = tasks.filter(t => [0, 1, 2].includes(t.status)).length;

      return ok({
        totalEscrowed: Math.round((config.totalEscrowed / LAMPORTS_PER_SOL) * 1000) / 1000,
        tasksCompleted: config.totalCompleted,
        activeAgents: new Set(
          tasks
            .filter(t => t.claimer !== '11111111111111111111111111111111')
            .map(t => t.claimer)
        ).size,
        totalTasks: config.taskCount,
        openTasks,
        activeTasks,
        protocolFeeBps: config.protocolFeeBps,
      });
    } catch (e) {
      console.error('On-chain stats fetch failed, falling back to mock:', e);
    }
  }

  return ok(store.getStats());
}
