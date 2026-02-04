import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { serializeTask, ok, err } from '@/lib/apiHelpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const agent = store.getAgent(name);
  if (!agent) return err('Agent not found', 404);

  const tasks = store.getAgentTasks(name);

  return ok({
    name: agent.name,
    wallet: agent.wallet,
    tasks_posted: agent.tasksPosted,
    tasks_completed: agent.tasksCompleted,
    sol_earned: agent.solEarned,
    approval_rate: agent.approvalRate,
    recent_tasks: tasks.slice(0, 10).map(serializeTask),
  });
}
