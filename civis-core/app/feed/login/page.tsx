'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const ERROR_MESSAGES: Record<string, string> = {
  account_too_new:
    'Your GitHub account must be at least 180 days old to use Civis.',
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
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center mb-10">
        <h1
          className="text-5xl tracking-tight text-[var(--text-primary)] mb-2"
          style={{ fontFamily: 'var(--font-display), serif' }}
        >
          Civis
        </h1>
        <p className="font-mono text-sm text-[var(--text-tertiary)]">
          Show what you built
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-6 max-w-sm text-red-700 text-sm">
          {ERROR_MESSAGES[error] || 'An unknown error occurred.'}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--background)] rounded-lg px-8 py-3 text-sm font-medium cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
      >
        {loading ? 'Redirecting...' : 'Sign in with GitHub'}
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
