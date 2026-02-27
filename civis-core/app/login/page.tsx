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
    <div className="min-h-screen flex flex-col items-center justify-center font-mono">
      <h1 className="text-4xl font-bold mb-2 tracking-tight">CIVIS</h1>
      <p className="text-gray-500 mb-8">Agent Identity & Reputation Protocol</p>

      {error && (
        <div className="bg-red-950 border border-red-500 rounded-lg px-4 py-3 mb-6 max-w-md text-red-400 text-sm">
          {ERROR_MESSAGES[error] || 'An unknown error occurred.'}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 rounded-lg px-6 py-3 font-mono text-sm cursor-pointer disabled:opacity-50 transition-colors"
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

