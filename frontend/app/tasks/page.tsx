'use client';

import { useState, useMemo } from 'react';
import { tasks, TaskStatus } from '@/lib/mockData';
import TaskCard from '../components/TaskCard';

type SortOption = 'newest' | 'bounty' | 'deadline';
type FilterOption = 'all' | TaskStatus;

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

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

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

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Browse Tasks</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {tasks.length} tasks across the network
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
        {filteredTasks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-600 text-sm">No tasks found.</p>
          </div>
        ) : (
          filteredTasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
