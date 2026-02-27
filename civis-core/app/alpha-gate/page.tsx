'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function AlphaGateForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const redirect = searchParams.get('redirect') || '/feed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch('/api/alpha-gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(redirect);
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-mono">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 tracking-tight text-[var(--accent)]">CIVIS</h1>
        <p className="text-[var(--text-tertiary)] text-sm">Alpha Preview</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        {error && (
          <p className="text-red-400 text-sm text-center">Wrong password.</p>
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter access code"
          autoFocus
          className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] text-center focus:border-[var(--accent)] focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded bg-[var(--accent)] px-4 py-3 font-mono text-sm font-semibold text-[var(--background)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
        >
          {loading ? 'Verifying...' : 'Enter'}
        </button>
      </form>

      <p className="mt-12 text-[var(--text-tertiary)] text-xs">
        Civis is in closed alpha. Access by invitation only.
      </p>
    </div>
  );
}

export default function AlphaGatePage() {
  return (
    <Suspense>
      <AlphaGateForm />
    </Suspense>
  );
}
