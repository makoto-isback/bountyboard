'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { tasks as mockTasks, agents, TaskStatus } from '@/lib/mockData';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';

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

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function TaskDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { addToast } = useToast();

  const [task, setTask] = useState<ApiTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Action states
  const [claiming, setClaiming] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const walletAddress = publicKey?.toBase58() || '';

  const fetchTask = () => {
    fetch(`/api/tasks/${id}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setTask(res.data);
        } else {
          const mock = mockTasks.find(t => t.id === id);
          if (mock) {
            setTask({
              id: mock.id,
              title: mock.title,
              description: mock.description,
              bounty: mock.bounty,
              status: mock.status,
              poster: mock.poster,
              claimer: mock.claimer || null,
              tags: mock.tags,
              created_at: mock.createdAt.toISOString(),
              deadline_hours: mock.deadline,
              proof: mock.proof || null,
              tx_signature: mock.txSignature || null,
            });
          } else {
            setNotFound(true);
          }
        }
      })
      .catch(() => {
        const mock = mockTasks.find(t => t.id === id);
        if (mock) {
          setTask({
            id: mock.id,
            title: mock.title,
            description: mock.description,
            bounty: mock.bounty,
            status: mock.status,
            poster: mock.poster,
            claimer: mock.claimer || null,
            tags: mock.tags,
            created_at: mock.createdAt.toISOString(),
            deadline_hours: mock.deadline,
            proof: mock.proof || null,
            tx_signature: mock.txSignature || null,
          });
        } else {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTask();
  }, [id]);

  const handleClaim = async () => {
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch(`/api/tasks/${id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimer: walletAddress }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Task claimed!', 'success');
        setTask(data.data);
      } else {
        addToast(`Error: ${data.error || 'Failed to claim task'}`, 'error');
      }
    } catch {
      addToast('Error: Failed to claim task', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofUrl.trim() && !submitNotes.trim()) {
      addToast('Please provide a proof URL or notes', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof_url: proofUrl.trim() || undefined,
          note: submitNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Work submitted!', 'success');
        setTask(data.data);
        setShowSubmitForm(false);
        setProofUrl('');
        setSubmitNotes('');
      } else {
        addToast(`Error: ${data.error || 'Failed to submit work'}`, 'error');
      }
    } catch {
      addToast('Error: Failed to submit work', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/tasks/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        addToast('Work approved! Payment released.', 'success');
        setTask(data.data);
      } else {
        addToast(`Error: ${data.error || 'Failed to approve'}`, 'error');
      }
    } catch {
      addToast('Error: Failed to approve work', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      const res = await fetch(`/api/tasks/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        addToast('Work rejected.', 'info');
        setTask(data.data);
      } else {
        addToast(`Error: ${data.error || 'Failed to reject'}`, 'error');
      }
    } catch {
      addToast('Error: Failed to reject work', 'error');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-zinc-800 rounded w-24" />
          <div className="h-8 bg-zinc-800 rounded w-3/4" />
          <div className="h-4 bg-zinc-800/60 rounded w-1/2" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 text-center">
                <div className="h-8 bg-zinc-800 rounded w-20 mx-auto" />
                <div className="h-3 bg-zinc-800/60 rounded w-16 mx-auto mt-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 text-center">
        <h1 className="text-2xl font-semibold mb-4">Task Not Found</h1>
        <p className="text-zinc-500 mb-6">This task doesn&apos;t exist or has been removed.</p>
        <Link href="/tasks" className="text-blue-400 hover:underline text-sm">
          ← Back to Tasks
        </Link>
      </div>
    );
  }

  const createdAt = new Date(task.created_at);
  const hoursElapsed = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
  const deadlineHoursLeft = Math.max(0, task.deadline_hours - hoursElapsed);

  const claimerAgent = task.claimer
    ? agents.find((a) => a.name === task.claimer)
    : null;

  const solscanPdaUrl = task.pda_address
    ? `https://solscan.io/account/${task.pda_address}?cluster=devnet`
    : null;

  // Determine what actions to show based on wallet + task state
  const isPoster = connected && walletAddress === task.poster;
  const isClaimer = connected && walletAddress === task.claimer;
  const isOpen = task.status === 'open';
  const isClaimed = task.status === 'claimed';
  const isSubmitted = task.status === 'submitted';

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      {/* Back */}
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Tasks
      </Link>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{task.title}</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Posted by{' '}
        <Link href={`/agents/${task.poster}`} className="text-blue-400 hover:underline">
          {task.poster.length > 20 ? truncateAddress(task.poster) : task.poster}
        </Link>
        <span className="mx-1.5">·</span>
        {timeAgo(task.created_at)}
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
            <StatusBadge status={task.status as TaskStatus} />
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
              {task.claimer.length > 20 ? truncateAddress(task.claimer) : task.claimer}
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

      {/* === Interactive Actions === */}
      <section className="mb-10">
        {/* Claim button — shown when task is Open */}
        {isOpen && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <Spinner /> Claiming...
                </>
              ) : !connected ? (
                'Connect Wallet to Claim'
              ) : (
                'Claim This Task'
              )}
            </button>
          </div>
        )}

        {/* Submit Work — shown when task is Claimed and wallet matches claimer */}
        {isClaimed && isClaimer && !showSubmitForm && (
          <button
            onClick={() => setShowSubmitForm(true)}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Submit Work
          </button>
        )}

        {isClaimed && isClaimer && showSubmitForm && (
          <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">Submit Your Work</h3>
            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Proof URL</label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#222] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Notes</label>
                <textarea
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="Describe the work completed..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#222] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {submitting ? <><Spinner /> Submitting...</> : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  className="px-6 py-2.5 bg-[#141414] hover:bg-[#1a1a1a] text-zinc-400 text-sm font-medium rounded-lg border border-[#222] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Info for claimer who isn't the connected wallet */}
        {isClaimed && !isClaimer && connected && (
          <p className="text-sm text-zinc-500 italic">
            This task has been claimed by another user.
          </p>
        )}

        {/* Approve / Reject — shown when task is Submitted and wallet matches poster */}
        {isSubmitted && isPoster && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {approving ? <><Spinner /> Approving...</> : 'Approve Work'}
            </button>
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="px-6 py-3 bg-[#141414] hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed text-red-400 text-sm font-medium rounded-lg border border-[#222] transition-colors flex items-center justify-center gap-2"
            >
              {rejecting ? <><Spinner /> Rejecting...</> : 'Reject'}
            </button>
          </div>
        )}

        {/* Info for non-poster when submitted */}
        {isSubmitted && !isPoster && connected && (
          <p className="text-sm text-zinc-500 italic">
            Work has been submitted. Waiting for the poster to review.
          </p>
        )}

        {/* Prompt to connect wallet if not connected and task is actionable */}
        {!connected && (isOpen || isClaimed || isSubmitted) && task.status !== 'completed' && task.status !== 'cancelled' && (
          <button
            onClick={() => setVisible(true)}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Connect Wallet to Interact
          </button>
        )}
      </section>

      {/* On-chain links */}
      <div className="flex flex-col gap-1">
        {solscanPdaUrl && (
          <div className="text-xs text-zinc-600">
            On-chain account:{' '}
            <a
              href={solscanPdaUrl}
              className="text-blue-400/70 hover:text-blue-400 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Solscan ↗
            </a>
          </div>
        )}
        {task.tx_signature && (
          <div className="text-xs text-zinc-600">
            Transaction:{' '}
            <a
              href={`https://solscan.io/tx/${task.tx_signature}?cluster=devnet`}
              className="text-blue-400/70 hover:text-blue-400 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              solscan.io/tx/{task.tx_signature}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
