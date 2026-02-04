'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
  totalEscrowed: number;
  tasksCompleted: number;
  activeAgents: number;
  totalTasks: number;
  openTasks: number;
  activeTasks: number;
  protocolFeeBps: number;
}

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

const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  claimed: '#a855f7',
  submitted: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
  disputed: '#f97316',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  claimed: 'Claimed',
  submitted: 'Submitted',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

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

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ])
      .then(([statsRes, tasksRes]) => {
        if (statsRes.success && statsRes.data) setStats(statsRes.data);
        if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Compute status counts
  const statusCounts: Record<string, number> = {};
  for (const s of ['open', 'claimed', 'submitted', 'completed', 'cancelled', 'disputed']) {
    statusCounts[s] = tasks.filter(t => t.status === s).length;
  }
  const maxCount = Math.max(...Object.values(statusCounts), 1);

  // Completed tasks for bottom section
  const completedTasks = tasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  // Protocol fees
  const avgBounty = tasks.length > 0 ? tasks.reduce((s, t) => s + t.bounty, 0) / tasks.length : 0;
  const protocolFees = stats ? Math.round(stats.tasksCompleted * avgBounty * 0.02 * 1000) / 1000 : 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold mb-8">Protocol Analytics</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6">
              <div className="h-8 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-4 bg-zinc-800/60 rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Protocol Analytics</h1>
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live from Devnet
        </div>
      </div>

      {/* Stat Cards — 2x3 grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <div className="text-3xl font-bold text-blue-400">
            {stats?.totalEscrowed ?? 0}
            <span className="text-lg text-zinc-500 ml-1">SOL</span>
          </div>
          <div className="mt-1 text-sm text-zinc-500">Total Escrowed</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <div className="text-3xl font-bold">{stats?.totalTasks ?? tasks.length}</div>
          <div className="mt-1 text-sm text-zinc-500">Tasks Created</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <div className="text-3xl font-bold text-emerald-400">{stats?.tasksCompleted ?? 0}</div>
          <div className="mt-1 text-sm text-zinc-500">Tasks Completed</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <div className="text-3xl font-bold text-blue-400">{stats?.openTasks ?? statusCounts.open}</div>
          <div className="mt-1 text-sm text-zinc-500">Open Tasks</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <div className="text-3xl font-bold">{stats?.activeAgents ?? 0}</div>
          <div className="mt-1 text-sm text-zinc-500">Active Agents</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6 text-center">
          <div className="text-3xl font-bold text-emerald-400">
            {protocolFees}
            <span className="text-lg text-zinc-500 ml-1">SOL</span>
          </div>
          <div className="mt-1 text-sm text-zinc-500">Protocol Fees Earned</div>
        </div>
      </div>

      {/* Task Activity — Bar Chart */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-6">Task Activity by Status</h2>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-6">
          <div className="space-y-4">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-4">
                <div className="w-24 text-sm text-zinc-400 text-right shrink-0">{label}</div>
                <div className="flex-1 bg-[#1a1a1a] rounded-full h-8 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
                    style={{
                      width: `${Math.max((statusCounts[key] / maxCount) * 100, statusCounts[key] > 0 ? 8 : 0)}%`,
                      backgroundColor: STATUS_COLORS[key],
                    }}
                  >
                    {statusCounts[key] > 0 && (
                      <span className="text-xs font-bold text-white drop-shadow">
                        {statusCounts[key]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-8 text-sm text-zinc-600 shrink-0">{statusCounts[key]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Completions */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-6">Recent Completions</h2>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111] divide-y divide-[#1a1a1a]">
          {completedTasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-600">
              No completed tasks yet.
            </div>
          ) : (
            completedTasks.map(task => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center justify-between p-4 hover:bg-[#141414] transition-colors block"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{task.title}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {task.claimer && (
                      <>
                        <span className="text-zinc-400">{task.claimer}</span>
                        <span className="mx-1.5">·</span>
                      </>
                    )}
                    {timeAgo(task.created_at)}
                  </p>
                </div>
                <div className="shrink-0 ml-4 flex items-center gap-2">
                  <span className="text-sm font-medium text-emerald-400">{task.bounty} SOL</span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">✓ Paid</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
