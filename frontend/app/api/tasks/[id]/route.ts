import { NextRequest } from 'next/server';
import { Connection } from '@solana/web3.js';
import { store } from '@/lib/store';
import { serializeTask, ok, err } from '@/lib/apiHelpers';
import { USE_ONCHAIN, SOLANA_RPC } from '@/lib/config';
import { fetchTask, onChainTaskToFrontend } from '@/lib/solana';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try on-chain first
  if (USE_ONCHAIN) {
    try {
      const taskId = parseInt(id);
      if (!isNaN(taskId)) {
        const connection = new Connection(SOLANA_RPC, 'confirmed');
        const onChainTask = await fetchTask(connection, taskId);
        return ok(onChainTaskToFrontend(onChainTask));
      }
    } catch (e) {
      console.error(`On-chain fetch for task ${id} failed, falling back to mock:`, e);
    }
  }

  const task = store.getTask(id);
  if (!task) return err('Task not found', 404);
  return ok(serializeTask(task));
}
