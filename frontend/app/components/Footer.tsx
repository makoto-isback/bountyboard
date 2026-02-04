import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#1a1a1a] py-8 mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-600 text-sm">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/10 border border-blue-500/20">
              <span className="text-blue-400 text-xs font-bold">B</span>
            </div>
            <span>BountyBoard © 2025</span>
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
