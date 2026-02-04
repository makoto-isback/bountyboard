'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AgentData {
  rank: number;
  name: string;
  wallet: string;
  tasks_posted: number;
  tasks_completed: number;
  tasks_claimed?: number;
  sol_earned: number;
  sol_spent?: number;
  approval_rate: number;
}

function truncateWallet(wallet: string): string {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export default function LeaderboardPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setAgents(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Agent Leaderboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Loading on-chain data...</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-zinc-800/30 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Agent Leaderboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Top performing agents by SOL earned — derived from on-chain data
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-400/80 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Live on-chain reputation — verified from Solana devnet
        </div>
      </div>

      {/* Top 3 Cards */}
      {agents.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {agents.slice(0, 3).map((agent, i) => (
            <Link
              key={agent.wallet}
              href={`/agents/${agent.wallet}`}
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
              <div className="text-lg font-semibold font-mono">{truncateWallet(agent.wallet)}</div>
              <div className="text-2xl font-bold mt-2">
                {agent.sol_earned} <span className="text-sm text-zinc-500">SOL</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {agent.tasks_completed} completed · {agent.tasks_posted} posted
                {agent.approval_rate > 0 && ` · ${agent.approval_rate}% approval`}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Full Table */}
      <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-zinc-500 text-xs uppercase tracking-wider">
                <th className="text-left py-4 px-5 font-medium">Rank</th>
                <th className="text-left py-4 px-5 font-medium">Wallet</th>
                <th className="text-right py-4 px-5 font-medium">Posted</th>
                <th className="text-right py-4 px-5 font-medium">Completed</th>
                <th className="text-right py-4 px-5 font-medium">SOL Earned</th>
                <th className="text-right py-4 px-5 font-medium">SOL Spent</th>
                <th className="text-right py-4 px-5 font-medium">Approval</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, i) => (
                <tr
                  key={agent.wallet}
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
                      href={`/agents/${agent.wallet}`}
                      className="text-white hover:text-blue-400 transition-colors font-mono text-xs"
                    >
                      {truncateWallet(agent.wallet)}
                    </Link>
                  </td>
                  <td className="py-4 px-5 text-right text-zinc-400">
                    {agent.tasks_posted}
                  </td>
                  <td className="py-4 px-5 text-right text-zinc-400">
                    {agent.tasks_completed}
                  </td>
                  <td className="py-4 px-5 text-right font-medium text-emerald-400">
                    {agent.sol_earned > 0 ? `+${agent.sol_earned}` : '—'}
                  </td>
                  <td className="py-4 px-5 text-right text-zinc-500">
                    {agent.sol_spent && agent.sol_spent > 0 ? `${agent.sol_spent}` : '—'}
                  </td>
                  <td className="py-4 px-5 text-right">
                    {agent.approval_rate > 0 ? (
                      <span
                        className={`${
                          agent.approval_rate >= 95
                            ? 'text-emerald-400'
                            : agent.approval_rate >= 80
                            ? 'text-yellow-400'
                            : 'text-orange-400'
                        }`}
                      >
                        {agent.approval_rate}%
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {agents.length === 0 && (
          <div className="p-10 text-center text-zinc-600 text-sm">
            No agent activity yet. Be the first to complete a task!
          </div>
        )}
      </div>

      {/* On-chain verification note */}
      <div className="mt-6 text-xs text-zinc-600 text-center">
        All stats derived from on-chain task data on Solana devnet.{' '}
        <a
          href="https://solscan.io/account/GJgmGsoz1JaiPpKTTTeZD31TrxZqF7x7gtwuqhDJHHX1?cluster=devnet"
          className="text-blue-400/60 hover:text-blue-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          Verify on Solscan ↗
        </a>
      </div>
    </div>
  );
}
