'use client';

import { useState, useEffect, useMemo } from 'react';
import { tasks as mockTasks, TaskStatus } from '@/lib/mockData';
import TaskCard from '../components/TaskCard';

type SortOption = 'newest' | 'bounty' | 'deadline';
type FilterOption = 'all' | TaskStatus;

interface ApiTask {
  id: string;
  title: string;
  description: string;
  bounty: number;
  status: string;
  poster: string;
  claimer: string | null;
  tags: string[];
  created_at: string;
  deadline_hours: number;
  proof: string | null;
  tx_signature: string | null;
  pda_address?: string;
}

// Convert API task to the format TaskCard expects
function apiTaskToLocal(t: ApiTask) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    bounty: t.bounty,
    status: t.status as TaskStatus,
    poster: t.poster,
    claimer: t.claimer || undefined,
    tags: t.tags,
    createdAt: new Date(t.created_at),
    deadline: t.deadline_hours,
    proof: t.proof || undefined,
    txSignature: t.tx_signature || undefined,
    pdaAddress: t.pda_address || undefined,
  };
}

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'bounty', label: 'Highest Bounty' },
  { value: 'deadline', label: 'Deadline' },
];

export default function TasksPage() {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [apiTasks, setApiTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingApi, setUsingApi] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    params.set('sort', sort);

    fetch(`/api/tasks?${params.toString()}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setApiTasks(res.data);
          setUsingApi(true);
        }
      })
      .catch(() => {}) // fallback to mock
      .finally(() => setLoading(false));
  }, [filter, sort]);

  // Use mock data as fallback with client-side filtering
  const fallbackTasks = useMemo(() => {
    let result = [...mockTasks];
    if (filter !== 'all') {
      result = result.filter((t) => t.status === filter);
    }
    switch (sort) {
      case 'newest':
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'bounty':
        result.sort((a, b) => b.bounty - a.bounty);
        break;
      case 'deadline':
        result.sort((a, b) => a.deadline - b.deadline);
        break;
    }
    return result;
  }, [filter, sort]);

  const displayTasks = usingApi ? apiTasks.map(apiTaskToLocal) : fallbackTasks;
  const totalCount = usingApi ? apiTasks.length : mockTasks.length;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Browse Tasks</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {loading ? '...' : `${totalCount} tasks across the network`}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-[#141414] text-zinc-500 border border-[#222] hover:text-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="bg-[#141414] border border-[#222] text-zinc-400 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/50"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          // Skeleton loading
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 animate-pulse"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-zinc-800 rounded w-3/4" />
                  <div className="h-4 bg-zinc-800/60 rounded w-1/2" />
                </div>
                <div className="h-6 bg-zinc-800 rounded w-20" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-6 bg-zinc-800/60 rounded w-16" />
                <div className="h-6 bg-zinc-800/60 rounded w-12" />
              </div>
            </div>
          ))
        ) : displayTasks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-600 text-sm">No tasks found.</p>
          </div>
        ) : (
          displayTasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
