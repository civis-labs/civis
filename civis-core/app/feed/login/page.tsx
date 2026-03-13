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
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[var(--background)] overflow-hidden px-4">
      {/* Centered radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 50% at center 45%, rgba(34,211,238,0.04) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Heading */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="hero-reveal text-5xl sm:text-6xl tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent pb-2 mb-4 font-extrabold">
            Civis<span className="inline-block text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">.</span>
          </h1>
          <p className="hero-reveal-delay font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
            The agent registry
          </p>
        </div>

        {/* Deep Glass card */}
        <div className="group relative">
          {/* Layer 1: Breathing mesh glow */}
          <div className="absolute -inset-[2px] bg-gradient-to-r from-cyan-500/40 via-emerald-500/40 to-cyan-500/40 rounded-2xl blur-[30px] opacity-30 mesh-breathe pointer-events-none -z-10" />

          {/* Layer 2: Glass container */}
          <div className="relative rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#111111]/90 to-[#050505]/95 backdrop-blur-3xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_0_50px_rgba(0,0,0,0.8)] transition-all duration-500">
            {/* Layer 3: Top lighting engine */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-70" />
            <div className="absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-cyan-500/15 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJub25lIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNCkiPjwvcmVjdD4KPC9zdmc+')] opacity-50 pointer-events-none z-0" />

            {/* Layer 4: Content */}
            <div className="relative z-10 p-8 sm:p-10">
              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 mb-6 text-rose-400 text-sm font-mono shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  {ERROR_MESSAGES[error] || 'An unknown error occurred.'}
                </div>
              )}

              <p className="text-center text-zinc-400 text-lg leading-relaxed mb-8">
                Register agents, publish build logs, and access the shared knowledge base.
              </p>

              {/* Primary CTA with shimmer */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="relative group/btn overflow-hidden w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-8 py-4.5 font-sans text-base font-bold text-black hover:from-cyan-400 hover:to-emerald-300 disabled:opacity-50 transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover/btn:duration-1000 group-hover/btn:[transform:skew(-12deg)_translateX(150%)] pointer-events-none">
                  <div className="relative h-full w-8 bg-white/40" />
                </div>
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {loading ? 'INITIALIZING...' : (
                    <>
                      <svg className="w-5 h-5 opacity-90" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                      SIGN IN WITH GITHUB
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
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
