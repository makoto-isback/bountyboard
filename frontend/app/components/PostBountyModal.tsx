'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useToast } from './Toast';

const AVAILABLE_TAGS = [
  'security', 'data', 'frontend', 'research', 'testing',
  'backend', 'smart-contract', 'design', 'documentation', 'devops',
];

interface PostBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PostBountyModal({ isOpen, onClose, onSuccess }: PostBountyModalProps) {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bounty, setBounty] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('48');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setBounty('');
      setSelectedTags([]);
      setDeadline('48');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    // Validation
    const bountyNum = parseFloat(bounty);
    if (!title.trim()) {
      addToast('Title is required', 'error');
      return;
    }
    if (isNaN(bountyNum) || bountyNum < 0.001) {
      addToast('Bounty must be at least 0.001 SOL', 'error');
      return;
    }
    if (selectedTags.length === 0) {
      addToast('Select at least one tag', 'error');
      return;
    }

    setSubmitting(true);

    try {
      /*
       * TODO: On-chain transaction via wallet adapter
       *
       * import { sha256 } from '@noble/hashes/sha256';
       * import { PublicKey, Transaction } from '@solana/web3.js';
       *
       * const descriptionHash = sha256(new TextEncoder().encode(title));
       * const [taskPda] = PublicKey.findProgramAddressSync(
       *   [Buffer.from('task'), publicKey.toBuffer(), descriptionHash],
       *   new PublicKey('GJgmGsoz1JaiPpKTTTeZD31TrxZqF7x7gtwuqhDJHHX1')
       * );
       *
       * // Build CreateTask instruction using SDK
       * const ix = createTaskInstruction({
       *   poster: publicKey,
       *   taskPda,
       *   descriptionHash: Array.from(descriptionHash),
       *   bountyLamports: bountyNum * LAMPORTS_PER_SOL,
       *   deadlineHours: parseInt(deadline),
       *   tags: selectedTags,
       * });
       *
       * const tx = new Transaction().add(ix);
       * const sig = await sendTransaction(tx, connection);
       * // Then store metadata via API
       */

      // For now, use REST API
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator: publicKey.toBase58(),
          title: title.trim(),
          description: description.trim() || title.trim(),
          bounty: bountyNum,
          tags: selectedTags,
          deadline: parseInt(deadline) || 48,
        }),
      });

      const data = await res.json();

      if (data.success) {
        addToast('Task posted successfully!', 'success');
        onClose();
        onSuccess?.();
      } else {
        addToast(`Error: ${data.error || 'Failed to post task'}`, 'error');
      }
    } catch (err) {
      addToast('Error: Failed to post task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#222] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-lg font-semibold">Post a Bounty</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Wallet status */}
          {!connected && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
              <span>⚠️</span>
              <span>Connect your wallet to post a bounty</span>
              <button
                type="button"
                onClick={() => setVisible(true)}
                className="ml-auto px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-xs font-medium transition-colors"
              >
                Connect
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Audit smart contract for vulnerabilities"
              className="w-full px-3 py-2.5 bg-[#111] border border-[#222] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the task..."
              rows={3}
              className="w-full px-3 py-2.5 bg-[#111] border border-[#222] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
            />
          </div>

          {/* Bounty */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Bounty (SOL) *</label>
            <input
              type="number"
              value={bounty}
              onChange={(e) => setBounty(e.target.value)}
              placeholder="0.1"
              min="0.001"
              step="0.001"
              className="w-full px-3 py-2.5 bg-[#111] border border-[#222] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Tags *</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : 'bg-[#111] border-[#222] text-zinc-500 hover:text-zinc-300 hover:border-[#333]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Deadline (hours)</label>
            <input
              type="number"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="48"
              min="1"
              className="w-full px-3 py-2.5 bg-[#111] border border-[#222] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !connected}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Posting...
              </>
            ) : !connected ? (
              'Connect Wallet to Post'
            ) : (
              'Post Bounty'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
