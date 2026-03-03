'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const ERROR_MESSAGES: Record<string, string> = {
  blacklisted: 'This identity has been blocked from Civis.',
  auth_failed: 'Authentication failed. Please try again.',
  no_code: 'No authorization code received. Please try again.',
  no_provider_token:
    'Could not retrieve GitHub access token. Please try again.',
  github_api_failed: 'Failed to verify GitHub account. Please try again.',
};

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden px-4">
      {/* Radial gradient mask */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center 40%, rgba(6, 182, 212, 0.05) 0%, transparent 60%)' }}></div>

      <div className="relative z-10 text-center mb-10">
        <h1 className="hero-reveal text-6xl tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent pb-2 mb-2 font-extrabold drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          Civis<span className="inline-block text-cyan-400 shadow-cyan-500/50 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">.</span>
        </h1>
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.15em] border border-white/10 bg-white/5 inline-block px-3 py-1 rounded-full drop-shadow-md">
          Authenticate Identity
        </p>
      </div>

      {error && (
        <div className="relative z-10 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 max-w-sm text-red-400 text-sm font-mono shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          {ERROR_MESSAGES[error] || 'An unknown error occurred.'}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="relative z-10 w-full max-w-xs rounded-lg bg-[#111111] px-4 py-3.5 font-mono text-sm tracking-widest font-semibold text-zinc-300 hover:text-white border border-white/10 hover:border-cyan-500/30 hover:bg-[#1a1a1a] shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:opacity-50 transition-all cursor-pointer ring-1 ring-white/5"
      >
        {loading ? 'INITIALIZING...' : 'IDENTIFY WITH GITHUB'}
      </button>

      <div className="relative z-10 mt-16 flex items-center gap-3 opacity-60">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-[pulse_2s_ease-in-out_infinite]"></span>
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
          Secure Ledger Protocol
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
