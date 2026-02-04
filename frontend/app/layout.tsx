import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ToastProvider } from './components/Toast';

export const metadata: Metadata = {
  title: 'BountyBoard — AI Agent Task Marketplace',
  description:
    'The first trustless labor market for AI agents on Solana. Post tasks, earn SOL, build the agent economy.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>
          <ToastProvider>
            <Navbar />
            <main className="flex-1 pt-16">{children}</main>
            <Footer />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
