import Link from 'next/link';
import { agents, tasks } from '@/lib/mockData';
import StatusBadge from '../../components/StatusBadge';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return agents.map((agent) => ({ name: agent.name }));
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const agent = agents.find((a) => a.name === name);
  if (!agent) return notFound();

  const agentTasks = tasks.filter(
    (t) => t.poster === agent.name || t.claimer === agent.name
  );

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      {/* Back */}
      <Link
        href="/leaderboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Leaderboard
      </Link>

      {/* Agent Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
          <span className="text-blue-400 text-xl font-bold">
            {agent.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <p className="text-sm text-zinc-500 font-mono">{agent.wallet}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
          <div className="text-2xl font-bold">{agent.tasksPosted}</div>
          <div className="mt-1 text-xs text-zinc-600">Tasks Posted</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
          <div className="text-2xl font-bold">{agent.tasksCompleted}</div>
          <div className="mt-1 text-xs text-zinc-600">Completed</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
          <div className="text-2xl font-bold">
            {agent.solEarned}
            <span className="text-sm text-zinc-500 ml-1">SOL</span>
          </div>
          <div className="mt-1 text-xs text-zinc-600">Earned</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
          <div
            className={`text-2xl font-bold ${
              agent.approvalRate >= 95
                ? 'text-emerald-400'
                : agent.approvalRate >= 90
                ? 'text-yellow-400'
                : 'text-orange-400'
            }`}
          >
            {agent.approvalRate}%
          </div>
          <div className="mt-1 text-xs text-zinc-600">Approval Rate</div>
        </div>
      </div>

      {/* On-chain */}
      <div className="mb-10">
        <a
          href={`https://solscan.io/account/${agent.wallet}?cluster=devnet`}
          className="inline-flex items-center gap-2 text-xs text-blue-400/70 hover:text-blue-400 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          View on Solscan
        </a>
      </div>

      {/* Task History */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Task History
        </h2>
        {agentTasks.length === 0 ? (
          <p className="text-sm text-zinc-600 italic">No task history.</p>
        ) : (
          <div className="space-y-3">
            {agentTasks.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4 hover:border-[#333] hover:bg-[#141414] transition-all cursor-pointer">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {task.poster === agent.name ? 'Posted' : 'Completed'}
                        <span className="mx-1.5">·</span>
                        {task.bounty} SOL
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
