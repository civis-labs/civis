'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface SignalData {
  account_age_days: number;
  public_repos: number;
  followers: number;
  has_bio: boolean;
  score: number;
  passed: boolean;
}

function VerifyContent({ signals }: { signals: SignalData | null }) {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('cancelled');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = signals
    ? [
      {
        label: 'Account age >= 30 days',
        detail: `${signals.account_age_days} days`,
        passed: signals.account_age_days >= 30,
      },
      {
        label: 'Has public repositories',
        detail: `${signals.public_repos} repos`,
        passed: signals.public_repos >= 1,
      },
      {
        label: 'Has followers',
        detail: `${signals.followers} followers`,
        passed: signals.followers >= 1,
      },
      {
        label: 'Has bio',
        detail: signals.has_bio ? 'Yes' : 'No',
        passed: signals.has_bio,
      },
    ]
    : [];

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[var(--background)] overflow-hidden px-4">
      {/* Radial gradient mask matching login/marketing but more subdued */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center 40%, rgba(34, 211, 238, 0.05) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl mt-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl tracking-tight text-white mb-2 font-extrabold drop-shadow-sm">
            Identity Verification
          </h1>
          <p className="font-mono text-xs text-zinc-500 uppercase tracking-[0.2em]">
            Step 2 of 2
          </p>
        </div>

        {cancelled && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 mb-8 text-amber-400 text-sm font-mono shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            Payment cancelled. You can try again anytime.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 mb-8 text-red-400 text-sm font-mono shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            {error}
          </div>
        )}

        {/* Signal Check Results */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 mb-8 shadow-2xl shadow-black/80 ring-1 ring-[var(--border-bright)]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[var(--border)] pb-5">
            <h2 className="font-mono text-sm text-zinc-400 uppercase tracking-[0.2em]">
              GitHub Signal Check
            </h2>
            <div className={`font-mono text-xs font-bold tracking-widest px-4 py-1.5 rounded-full inline-flex items-center justify-center ${(signals?.score ?? 0) >= 3 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
              {signals?.score ?? 0}/4 PASSED
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {checks.map((check) => (
              <div
                key={check.label}
                className="flex flex-col gap-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] p-5 transition-colors hover:border-[var(--border-bright)]"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-sm text-zinc-300 leading-snug">
                    {check.label}
                  </span>
                  {check.passed ? (
                    <CheckCircle2 size={20} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0 ml-3" />
                  ) : (
                    <XCircle size={20} className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] shrink-0 ml-3" />
                  )}
                </div>
                <span className="font-mono text-xs text-cyan-400/80">
                  {check.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Escape hatch */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 text-center shadow-2xl shadow-black/80 ring-1 ring-[var(--border-bright)]/30 max-w-md mx-auto">
          <p className="font-sans text-[15px] text-[var(--text-secondary)] mb-6 leading-relaxed">
            Verify your identity with a $1 one-time payment. This helps us
            prevent bot accounts while keeping the platform accessible to real developers.
          </p>
          <button
            onClick={handleVerify}
            disabled={loading}
            className="group flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-8 py-4 font-mono text-sm font-bold tracking-[0.2em] text-cyan-950 hover:bg-cyan-300 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
          >
            {loading ? 'REDIRECTING...' : 'VERIFY WITH $1'}
          </button>
          <p className="font-mono text-[10px] text-zinc-600 mt-5 uppercase tracking-widest">
            Processed securely via Stripe. One card per account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyClient({
  signals,
}: {
  signals: SignalData | null;
}) {
  return (
    <Suspense>
      <VerifyContent signals={signals} />
    </Suspense>
  );
}

