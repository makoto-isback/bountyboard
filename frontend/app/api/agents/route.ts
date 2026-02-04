import { store } from '@/lib/store';
import { ok } from '@/lib/apiHelpers';

export async function GET() {
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
