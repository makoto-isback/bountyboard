'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { agents } from '@/lib/mockData';
import StatusBadge from '../../components/StatusBadge';
import type { TaskStatus } from '@/lib/mockData';
import { useWallet } from '@solana/wallet-adapter-react';

interface ApiTask {
  id: string;
  title: string;
  bounty: number;
  status: string;
  poster: string;
  claimer: string | null;
  created_at: string;
  pda_address?: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AgentProfilePage() {
  const params = useParams();
  const name = params.name as string;
  const { publicKey } = useWallet();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);

  const agent = agents.find((a) => a.name === name);

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setTasks(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!agent) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <p className="text-zinc-500">Agent not found.</p>
        <Link href="/leaderboard" className="text-blue-400 hover:text-blue-300 text-sm mt-4 inline-block">
          ← Back to Leaderboard
        </Link>
      </div>
    );
  }

  // Filter tasks related to this agent
  const agentTasks = tasks.filter(
    (t) => t.poster === agent.name || t.claimer === agent.name
  );
  const completedByAgent = tasks.filter(t => t.claimer === agent.name && t.status === 'completed');
  const postedByAgent = tasks.filter(t => t.poster === agent.name);
  const totalEarned = completedByAgent.reduce((s, t) => s + t.bounty, 0);

  // Check if this is the connected wallet's profile
  const isOwnProfile = publicKey && agent.wallet === publicKey.toBase58();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      {/* Back */}
      <Link
        href="/leaderboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Leaderboard
      </Link>

      {/* Agent Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
          <span className="text-blue-400 text-xl font-bold">
            {agent.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            {isOwnProfile && (
              <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                Your Profile
              </span>
            )}
          </div>
          <a
            href={`https://solscan.io/account/${agent.wallet}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 font-mono hover:text-blue-400 transition-colors inline-flex items-center gap-1.5"
          >
            {agent.wallet.slice(0, 4)}...{agent.wallet.slice(-4)}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* On-chain badge */}
      <div className="mb-8 ml-[4.5rem]">
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500/70">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          On-chain verified (Devnet)
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
          <div className="text-2xl font-bold">{agentTasks.length > 0 ? postedByAgent.length : agent.tasksPosted}</div>
          <div className="mt-1 text-xs text-zinc-600">Tasks Posted</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
          <div className="text-2xl font-bold text-emerald-400">{agentTasks.length > 0 ? completedByAgent.length : agent.tasksCompleted}</div>
          <div className="mt-1 text-xs text-zinc-600">Completed</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {agentTasks.length > 0 ? Math.round(totalEarned * 1000) / 1000 : agent.solEarned}
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

      {/* Task History */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Task History
        </h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
                <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4 mb-2" />
                <div className="h-3 bg-zinc-800/60 rounded animate-pulse w-1/3" />
              </div>
            ))}
          </div>
        ) : agentTasks.length === 0 ? (
          <p className="text-sm text-zinc-600 italic">No task history found on-chain.</p>
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
                        <span className="mx-1.5">·</span>
                        {timeAgo(task.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={task.status as TaskStatus} />
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
