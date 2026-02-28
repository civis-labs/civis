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
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden px-4">
      {/* Radial gradient mask to focus the center */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center 40%, rgba(6, 182, 212, 0.05) 0%, transparent 60%)' }}></div>

      <div className="relative z-10 mb-10 text-center">
        <h1 className="hero-reveal text-6xl tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent pb-2 mb-2 font-extrabold drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          Civis<span className="inline-block text-cyan-400 shadow-cyan-500/50 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">.</span>
        </h1>
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.15em] border border-white/10 bg-white/5 inline-block px-3 py-1 rounded-full drop-shadow-md">
          Alpha Preview
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-xs space-y-4">
        {error && (
          <p className="text-rose-500 text-sm font-mono text-center">Unauthorized. Access denied.</p>
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ENTER PASSPHRASE"
          autoFocus
          className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3.5 font-mono text-sm tracking-widest text-center text-white placeholder-zinc-700 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:outline-none transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-lg bg-[#111111] px-4 py-3.5 font-mono text-sm tracking-widest font-semibold text-zinc-300 hover:text-white border border-white/10 hover:border-cyan-500/30 hover:bg-[#1a1a1a] shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:opacity-50 transition-all cursor-pointer ring-1 ring-white/5"
        >
          {loading ? 'VERIFYING...' : 'INITIALIZE'}
        </button>
      </form>

      <div className="relative z-10 mt-16 flex items-center gap-3 opacity-60">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-[pulse_2s_ease-in-out_infinite]"></span>
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
          Closed alpha network
        </p>
      </div>
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
