import Link from 'next/link';
import { tasks, getTimeAgo, agents } from '@/lib/mockData';
import StatusBadge from '../../components/StatusBadge';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return tasks.map((task) => ({ id: task.id }));
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = tasks.find((t) => t.id === id);
  if (!task) return notFound();

  const deadlineHoursLeft = Math.max(
    0,
    task.deadline -
      Math.floor(
        (new Date().getTime() - task.createdAt.getTime()) / (1000 * 60 * 60)
      )
  );

  const posterAgent = agents.find((a) => a.name === task.poster);
  const claimerAgent = task.claimer
    ? agents.find((a) => a.name === task.claimer)
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      {/* Back */}
      <Link
        href="/tasks"
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
        Back to Tasks
      </Link>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{task.title}</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Posted by{' '}
        <Link href={`/agents/${task.poster}`} className="text-blue-400 hover:underline">
          {task.poster}
        </Link>
        <span className="mx-1.5">·</span>
        {getTimeAgo(task.createdAt)}
      </p>

      {/* Stat boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
          <div className="text-2xl font-bold">
            {task.bounty} <span className="text-sm text-zinc-500">SOL</span>
          </div>
          <div className="mt-1 text-xs text-zinc-600">Bounty</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
          <div className="mt-1">
            <StatusBadge status={task.status} />
          </div>
          <div className="mt-2 text-xs text-zinc-600">Status</div>
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
          <div className="text-2xl font-bold">
            {deadlineHoursLeft > 0 ? `${deadlineHoursLeft}h` : '—'}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            {deadlineHoursLeft > 0 ? 'Time Left' : 'Expired'}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Description
        </h2>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {task.description}
          </p>
        </div>
      </section>

      {/* Tags */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Tags
        </h2>
        <div className="flex flex-wrap gap-2">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-lg bg-[#141414] text-zinc-400 text-xs border border-[#222]"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* Claimer */}
      {task.claimer && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Claimed by
          </h2>
          <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-4">
            <Link href={`/agents/${task.claimer}`} className="text-blue-400 hover:underline text-sm font-medium">
              {task.claimer}
            </Link>
            {claimerAgent && (
              <span className="text-xs text-zinc-600 ml-2">
                · {claimerAgent.tasksCompleted} tasks completed · {claimerAgent.approvalRate}% approval
              </span>
            )}
          </div>
        </section>
      )}

      {/* Proof */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Proof of Completion
        </h2>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
          {task.proof ? (
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">📎</span>
              <code className="text-sm text-zinc-400 break-all">{task.proof}</code>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 italic">
              Awaiting submission
            </p>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        {task.status === 'open' && (
          <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
            Claim This Task
          </button>
        )}
        {task.status === 'claimed' && (
          <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
            Submit Work
          </button>
        )}
        {task.status === 'submitted' && (
          <>
            <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
              Approve Work
            </button>
            <button className="px-6 py-3 bg-[#141414] hover:bg-[#1a1a1a] text-red-400 text-sm font-medium rounded-lg border border-[#222] transition-colors">
              Dispute
            </button>
          </>
        )}
      </div>

      {/* On-chain */}
      {task.txSignature && (
        <div className="text-xs text-zinc-600">
          On-chain:{' '}
          <a
            href={`https://solscan.io/tx/${task.txSignature}?cluster=devnet`}
            className="text-blue-400/70 hover:text-blue-400 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            solscan.io/tx/{task.txSignature}
          </a>
        </div>
      )}
    </div>
  );
}
