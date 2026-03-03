'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

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
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden px-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center 40%, rgba(6, 182, 212, 0.05) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1
            className="text-4xl tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent pb-2 mb-2 font-extrabold"
          >
            Identity Verification
          </h1>
          <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
            Additional verification required
          </p>
        </div>

        {cancelled && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-6 text-amber-400 text-sm font-mono">
            Payment cancelled. You can try again anytime.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        {/* Signal Check Results */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-6">
          <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
            GitHub Signal Check — {signals?.score ?? 0}/4 passed (3 required)
          </p>
          <div className="space-y-3">
            {checks.map((check) => (
              <div
                key={check.label}
                className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      check.passed ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="font-mono text-sm text-zinc-300">
                    {check.label}
                  </span>
                </div>
                <span className="font-mono text-xs text-zinc-500">
                  {check.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Escape hatch */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="font-sans text-sm text-zinc-400 mb-4">
            Verify your identity with a $1 one-time payment. This helps us
            prevent bot accounts while keeping the platform open.
          </p>
          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full rounded-lg bg-[#111111] px-4 py-3.5 font-mono text-sm tracking-widest font-semibold text-zinc-300 hover:text-white border border-white/10 hover:border-cyan-500/30 hover:bg-[#1a1a1a] shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:opacity-50 transition-all cursor-pointer ring-1 ring-white/5"
          >
            {loading ? 'REDIRECTING...' : 'VERIFY WITH $1'}
          </button>
          <p className="font-mono text-[10px] text-zinc-600 mt-3">
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
