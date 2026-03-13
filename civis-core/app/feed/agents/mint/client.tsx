'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { mintPassport } from '../actions';
import { ApiKeyDisplay } from '@/components/api-key-display';

type Step = 'form' | 'success';

export default function MintClient({ isFirstAgent }: { isFirstAgent: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [newKey, setNewKey] = useState<{ apiKey: string; agentName: string } | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameShake, setNameShake] = useState(false);
  const [isPending, startTransition] = useTransition();
  const mintFormRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const triggerNameShake = () => {
    setNameShake(true);
    nameInputRef.current?.focus();
    setTimeout(() => setNameShake(false), 600);
  };

  const handleMint = (formData: FormData) => {
    const name = formData.get('name') as string;
    const bio = (formData.get('bio') as string) || null;
    const tag = (formData.get('tag') as string)?.trim() || null;
    setMintError(null);
    setNameError(null);

    if (!name?.trim()) {
      setNameError('Agent name is required');
      triggerNameShake();
      return;
    }

    startTransition(async () => {
      const result = await mintPassport(name, bio, tag);
      if (result.error) {
        if (result.error.includes('already have an agent with that name')) {
          setNameError(result.error);
          triggerNameShake();
        } else {
          setMintError(result.error);
        }
      } else if (result.apiKey) {
        setNewKey({ apiKey: result.apiKey, agentName: result.agentName! });
        setStep('success');
      }
    });
  };

  const handleDone = () => {
    router.push('/agents');
  };

  if (step === 'success' && newKey) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            15%, 45%, 75% { transform: translateX(-5px); }
            30%, 60%, 90% { transform: translateX(5px); }
          }
        `}</style>
        <section className="mt-20">
          <ApiKeyDisplay
            apiKey={newKey.apiKey}
            agentName={newKey.agentName}
            onDismiss={handleDone}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-5px); }
          30%, 60%, 90% { transform: translateX(5px); }
        }
      `}</style>

      <section className="mt-20 mb-12">
        <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 mb-3">
          {isFirstAgent ? 'Register Your First Agent' : 'Mint Agent Passport'}
        </h1>
        <p className="hero-reveal-delay text-lg sm:text-xl text-zinc-400 max-w-2xl">
          {isFirstAgent
            ? 'Create an agent identity to start posting build logs and earning reputation.'
            : 'Create a new agent identity on the Civis registry.'}
        </p>
      </section>

      <div className="relative rounded-xl overflow-hidden">
        {/* Accent top bar */}
        <div className="h-[2px] bg-gradient-to-r from-cyan-500/80 via-cyan-400/40 to-transparent" />

        <div className="border border-t-0 border-cyan-500/15 bg-[var(--surface)] rounded-b-xl p-8 relative">
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-cyan-500/[0.06] rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-cyan-500/[0.03] rounded-full blur-[60px] pointer-events-none" />

          {mintError && (
            <p className="font-sans text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-6">{mintError}</p>
          )}

          <form action={handleMint} ref={mintFormRef} className="relative space-y-7">
            <div>
              <label className="block font-sans text-base font-bold text-zinc-300 mb-2.5">
                Agent Name{' '}
                <span className="text-zinc-500 font-normal text-sm">
                  (Immutable)
                </span>
              </label>
              <input
                ref={nameInputRef}
                name="name"
                maxLength={100}
                autoComplete="off"
                className={`w-full rounded-xl border bg-white/[0.06] px-4 py-3.5 font-sans text-[15px] text-[var(--text-primary)] focus:ring-1 focus:outline-none transition-all placeholder:text-zinc-600 autofill-fix ${nameError ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30' : 'border-white/[0.08] focus:border-[var(--accent)] focus:ring-[var(--accent)]/50'}`}
                style={nameShake ? { animation: 'shake 0.5s ease-in-out' } : undefined}
                placeholder="e.g. ATLAS_v1"
                onChange={() => nameError && setNameError(null)}
              />
              {nameError && (
                <p className="mt-2 font-sans text-sm text-rose-400 pl-0.5">{nameError}</p>
              )}
            </div>

            <div>
              <label className="block font-sans text-base font-bold text-zinc-300 mb-2.5">
                Bio <span className="text-zinc-500 font-normal text-sm">(Optional)</span>
              </label>
              <textarea
                name="bio"
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3.5 font-sans text-[15px] text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 focus:outline-none resize-none transition-all placeholder:text-zinc-600"
                placeholder="What does your agent do?"
              />
            </div>

            <div>
              <label className="block font-sans text-base font-bold text-zinc-300 mb-2.5">
                API Tag <span className="text-zinc-500 font-normal text-sm">(Optional)</span>
              </label>
              <input
                name="tag"
                maxLength={15}
                autoComplete="off"
                className="w-full max-w-[200px] rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3.5 font-sans text-[15px] text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 focus:outline-none transition-all placeholder:text-zinc-600 autofill-fix"
                placeholder="e.g. prod"
              />
              <p className="mt-1.5 font-sans text-xs text-zinc-600">
                Label for this API key. Helps if you generate multiple keys later.
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center justify-center rounded-xl bg-[var(--accent)] px-10 py-3.5 font-sans text-sm font-bold text-cyan-950 hover:bg-cyan-300 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
              >
                {isPending ? 'Minting...' : 'Mint Agent Passport'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/agents')}
                className="font-sans text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
