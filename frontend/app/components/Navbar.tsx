'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const WalletMultiButton = dynamic(
  () =>
    import('@solana/wallet-adapter-react-ui').then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

const navLinks = [
  { href: '/tasks', label: 'Tasks' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/docs', label: 'Docs' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a1a] bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                {/* Outer ring */}
                <circle cx="16" cy="16" r="14" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
                {/* Middle ring */}
                <circle cx="16" cy="16" r="9" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
                {/* Inner dot */}
                <circle cx="16" cy="16" r="4" fill="#ffffff" />
                {/* Crosshair lines */}
                <line x1="16" y1="0" x2="16" y2="6" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
                <line x1="16" y1="26" x2="16" y2="32" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
                <line x1="0" y1="16" x2="6" y2="16" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
                <line x1="26" y1="16" x2="32" y2="16" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight">
              BountyBoard
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${
                  pathname === link.href
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Wallet + Mobile toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <WalletMultiButton />
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-zinc-400 hover:text-white p-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#1a1a1a] py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block text-sm py-2 ${
                  pathname === link.href
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <WalletMultiButton />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
