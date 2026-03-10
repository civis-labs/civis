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
      </div>

      {error && (
        <div className="relative z-10 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 max-w-sm text-red-400 text-sm font-mono shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          {ERROR_MESSAGES[error] || 'An unknown error occurred.'}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="group relative z-10 w-full max-w-xs overflow-hidden rounded-xl bg-[var(--accent)] px-8 py-3.5 font-sans text-sm font-bold text-cyan-950 hover:bg-cyan-300 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center gap-3 mt-4"
      >
        <span className="relative z-10 flex items-center justify-center gap-3">
          {loading ? 'INITIALIZING...' : (
            <>
              <svg className="w-5 h-5 opacity-90" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path></svg>
              LOGIN WITH GITHUB
            </>
          )}
        </span>
      </button>
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
