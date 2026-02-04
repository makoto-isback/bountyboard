import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#1a1a1a] py-8 mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-600 text-sm">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#3B82F6" strokeWidth="1.5" opacity="0.4" />
              <circle cx="16" cy="16" r="9" stroke="#3B82F6" strokeWidth="1.5" opacity="0.7" />
              <circle cx="16" cy="16" r="4" fill="#3B82F6" />
            </svg>
            <span>BountyBoard © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-600">
            <Link
              href="https://github.com/example/bountyboard"
              className="hover:text-zinc-400 transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="https://arena.colosseum.org"
              className="hover:text-zinc-400 transition-colors"
            >
              Colosseum
            </Link>
            <Link
              href="https://solscan.io"
              className="hover:text-zinc-400 transition-colors"
            >
              Solscan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
