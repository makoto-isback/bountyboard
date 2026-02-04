import Link from 'next/link';
import { Task, getTimeAgo } from '@/lib/mockData';
import StatusBadge from './StatusBadge';

export default function TaskCard({ task }: { task: Task }) {
  const deadlineHoursLeft = Math.max(
    0,
    task.deadline -
      Math.floor(
        (new Date().getTime() - task.createdAt.getTime()) / (1000 * 60 * 60)
      )
  );

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="group rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 transition-all duration-200 hover:border-[#333] hover:bg-[#141414] card-glow cursor-pointer">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-medium text-white group-hover:text-blue-400 transition-colors truncate">
              {task.title}
            </h3>
            <p className="mt-1.5 text-sm text-zinc-500">
              Posted by{' '}
              <span className="text-zinc-400">{task.poster}</span>
              <span className="mx-1.5">·</span>
              {getTimeAgo(task.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-lg font-semibold text-white">
              {task.bounty} <span className="text-sm text-zinc-500">SOL</span>
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md bg-[#1a1a1a] text-zinc-500 text-xs border border-[#222]"
            >
              {tag}
            </span>
          ))}
          <span className="ml-auto text-xs text-zinc-600">
            {deadlineHoursLeft > 0
              ? `${deadlineHoursLeft}h left`
              : 'Expired'}
          </span>
        </div>
      </div>
    </Link>
  );
}
