'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const ERROR_MESSAGES: Record<string, string> = {
  blacklisted: 'This identity has been blocked from Civis.',
  auth_failed: 'Authentication failed. Please try again.',
  no_code: 'No authorization code received. Please try again.',
  magic_link_failed: 'Failed to send login link. Please try again.',
};

const SUCCESS_MESSAGES: Record<string, string> = {
  magic_link_sent: 'Check your email for a login link.',
};

type OAuthProvider = 'github' | 'google';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [magicLinkState, setMagicLinkState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);

  const handleOAuth = async (provider: OAuthProvider) => {
    setLoadingProvider(provider);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || magicLinkState === 'sending') return;

    setMagicLinkState('sending');
    setMagicLinkError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (otpError) {
        setMagicLinkState('error');
        setMagicLinkError(otpError.message);
      } else {
        setMagicLinkState('sent');
      }
    } catch {
      setMagicLinkState('error');
      setMagicLinkError('Something went wrong. Please try again.');
    }
  };

  const oauthButtonClass =
    'relative w-full rounded-xl px-8 py-4 font-sans text-sm font-bold transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3';

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[var(--background)] overflow-hidden px-4">
      {/* Centered radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 50% at center 45%, rgba(34,211,238,0.04) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-md">
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

              {/* OAuth Providers */}
              <div className="flex flex-col gap-3 mb-6">
                {/* GitHub - Primary */}
                <button
                  onClick={() => handleOAuth('github')}
                  disabled={loadingProvider !== null}
                  className={`${oauthButtonClass} bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                  {loadingProvider === 'github' ? 'REDIRECTING...' : 'CONTINUE WITH GITHUB'}
                </button>

                {/* Google */}
                <button
                  onClick={() => handleOAuth('google')}
                  disabled={loadingProvider !== null}
                  className={`${oauthButtonClass} bg-[#1a1a1a] text-white border border-white/[0.08] hover:bg-[#222] hover:border-white/[0.15]`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {loadingProvider === 'google' ? 'REDIRECTING...' : 'CONTINUE WITH GOOGLE'}
                </button>

              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-zinc-600 text-xs font-mono uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {/* Magic Link */}
              {magicLinkState === 'sent' ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-5 text-center">
                  <p className="text-emerald-400 text-sm font-mono mb-2">
                    {SUCCESS_MESSAGES.magic_link_sent}
                  </p>
                  <p className="text-zinc-500 text-xs font-mono">
                    Didn&apos;t receive it? Check your spam folder or{' '}
                    <button
                      onClick={() => setMagicLinkState('idle')}
                      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer"
                    >
                      try again
                    </button>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-5 py-3.5 text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                  {magicLinkError && (
                    <p className="text-rose-400 text-xs font-mono">{magicLinkError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={magicLinkState === 'sending' || !email.trim()}
                    className={`${oauthButtonClass} bg-[#1a1a1a] text-white border border-white/[0.08] hover:bg-[#222] hover:border-white/[0.15] disabled:opacity-40`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {magicLinkState === 'sending' ? 'SENDING...' : 'SEND MAGIC LINK'}
                  </button>
                </form>
              )}
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
