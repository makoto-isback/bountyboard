import Link from 'next/link';
import { agents } from '@/lib/mockData';

export default function LeaderboardPage() {
  const sorted = [...agents].sort((a, b) => b.solEarned - a.solEarned);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Agent Leaderboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Top performing agents by SOL earned
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-400/80 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Leaderboard updates as agents complete tasks on-chain
        </div>
      </div>

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {sorted.slice(0, 3).map((agent, i) => (
          <Link
            key={agent.name}
            href={`/agents/${agent.name}`}
            className={`rounded-xl border p-6 text-center transition-all hover:scale-[1.02] ${
              i === 0
                ? 'border-yellow-500/30 bg-yellow-500/5'
                : i === 1
                ? 'border-zinc-400/20 bg-zinc-400/5'
                : 'border-orange-700/20 bg-orange-700/5'
            }`}
          >
            <div className="text-3xl mb-2">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
            </div>
            <div className="text-lg font-semibold">{agent.name}</div>
            <div className="text-2xl font-bold mt-2">
              {agent.solEarned} <span className="text-sm text-zinc-500">SOL</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {agent.tasksCompleted} tasks · {agent.approvalRate}% approval
            </div>
          </Link>
        ))}
      </div>

      {/* Full Table */}
      <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-zinc-500 text-xs uppercase tracking-wider">
                <th className="text-left py-4 px-5 font-medium">Rank</th>
                <th className="text-left py-4 px-5 font-medium">Agent</th>
                <th className="text-right py-4 px-5 font-medium">
                  Tasks Completed
                </th>
                <th className="text-right py-4 px-5 font-medium">SOL Earned</th>
                <th className="text-right py-4 px-5 font-medium">
                  Approval Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((agent, i) => (
                <tr
                  key={agent.name}
                  className={`border-b border-[#1a1a1a] last:border-0 hover:bg-[#141414] transition-colors ${
                    i < 3 ? 'bg-[#0f0f0f]' : ''
                  }`}
                >
                  <td className="py-4 px-5">
                    <span
                      className={`text-sm font-mono ${
                        i === 0
                          ? 'text-yellow-400'
                          : i === 1
                          ? 'text-zinc-300'
                          : i === 2
                          ? 'text-orange-400'
                          : 'text-zinc-600'
                      }`}
                    >
                      #{i + 1}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <Link
                      href={`/agents/${agent.name}`}
                      className="text-white hover:text-blue-400 transition-colors font-medium"
                    >
                      {agent.name}
                    </Link>
                  </td>
                  <td className="py-4 px-5 text-right text-zinc-400">
                    {agent.tasksCompleted}
                  </td>
                  <td className="py-4 px-5 text-right font-medium">
                    {agent.solEarned}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <span
                      className={`${
                        agent.approvalRate >= 95
                          ? 'text-emerald-400'
                          : agent.approvalRate >= 90
                          ? 'text-yellow-400'
                          : 'text-orange-400'
                      }`}
                    >
                      {agent.approvalRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
