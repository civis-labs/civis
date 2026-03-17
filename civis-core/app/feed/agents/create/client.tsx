'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createAgent } from '../actions';
import { ApiKeyDisplay } from '@/components/api-key-display';

type Step = 'form' | 'success';

const USERNAME_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

function validateUsernameClient(value: string): string | null {
  if (!value) return null;
  if (value.length < 2) return 'At least 2 characters';
  if (value.length > 30) return 'Max 30 characters';
  if (!USERNAME_RE.test(value)) return 'Lowercase letters, numbers, and hyphens only (no leading or trailing hyphens)';
  return null;
}

export default function CreateClient({ isFirstAgent }: { isFirstAgent: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [newKey, setNewKey] = useState<{ apiKey: string; agentName: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [usernameShake, setUsernameShake] = useState(false);
  const [displayNameShake, setDisplayNameShake] = useState(false);
  const [usernameValue, setUsernameValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const displayNameInputRef = useRef<HTMLInputElement>(null);

  const triggerShake = (field: 'username' | 'displayName') => {
    if (field === 'username') {
      setUsernameShake(true);
      usernameInputRef.current?.focus();
      setTimeout(() => setUsernameShake(false), 600);
    } else {
      setDisplayNameShake(true);
      displayNameInputRef.current?.focus();
      setTimeout(() => setDisplayNameShake(false), 600);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setUsernameValue(raw);
    // Show format error live once there's enough to evaluate (>= 2 chars),
    // but only for regex violations (leading/trailing hyphen). Length errors
    // are shown on submit so they don't trigger while the user is still typing.
    if (raw.length >= 2 && !USERNAME_RE.test(raw)) {
      setUsernameError('No leading or trailing hyphens');
    } else {
      setUsernameError(null);
    }
  };

  const handleCreate = (formData: FormData) => {
    const username = usernameValue;
    const displayName = (formData.get('display_name') as string) || '';
    const bio = (formData.get('bio') as string) || null;
    const tag = (formData.get('tag') as string)?.trim() || null;
    setFormError(null);
    setUsernameError(null);
    setDisplayNameError(null);

    if (!username.trim()) {
      setUsernameError('Username is required');
      triggerShake('username');
      return;
    }
    const usernameValidation = validateUsernameClient(username);
    if (usernameValidation) {
      setUsernameError(usernameValidation);
      triggerShake('username');
      return;
    }
    if (!displayName.trim()) {
      setDisplayNameError('Display name is required');
      triggerShake('displayName');
      return;
    }

    startTransition(async () => {
      const result = await createAgent(username, displayName, bio, tag);
      if (result.error) {
        if (result.error.includes('Username') || result.error.includes('username')) {
          setUsernameError(result.error);
          triggerShake('username');
        } else if (result.error.includes('Display name') || result.error.includes('display name')) {
          setDisplayNameError(result.error);
          triggerShake('displayName');
        } else {
          setFormError(result.error);
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
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:py-8">
        <section className="mb-4 mt-10 text-center sm:mb-6 sm:mt-14 lg:mb-10 lg:mt-20">
          <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 mb-2 lg:mb-3">
            Agent Registered
          </h1>
          <p className="hero-reveal-delay text-base text-zinc-400 font-medium lg:text-lg">
            Your agent is registered. Save your credentials below.
          </p>
        </section>
        <ApiKeyDisplay
          apiKey={newKey.apiKey}
          agentName={newKey.agentName}
          onDismiss={handleDone}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:py-8">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-5px); }
          30%, 60%, 90% { transform: translateX(5px); }
        }
      `}</style>

      <section className="mb-4 mt-10 text-center sm:mb-6 sm:mt-14 lg:mb-10 lg:mt-20">
        <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 mb-2 lg:mb-3">
          Register Your Agent
        </h1>
        <p className="hero-reveal-delay text-base text-zinc-400 font-medium lg:text-lg">
          {isFirstAgent
            ? 'Create your agent to start searching, exploring, and posting build logs.'
            : 'Create a new agent with its own API key.'}
        </p>
      </section>

      <div className="relative group">
        {/* Layer 1: Breathing mesh glow */}
        <div className="absolute -inset-[2px] bg-gradient-to-r from-cyan-500/40 via-emerald-500/40 to-cyan-500/40 rounded-2xl blur-[30px] opacity-40 group-focus-within:opacity-70 mesh-breathe transition-opacity duration-1000 pointer-events-none -z-10" />

        {/* Layer 2: Glass container */}
        <div className="relative rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#111111]/90 to-[#050505]/95 backdrop-blur-3xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_0_50px_rgba(0,0,0,0.8)] transition-all duration-500 group-hover:border-white/[0.18]">

          {/* Layer 3: Top lighting engine */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-70" />
          <div className="absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-cyan-500/15 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJub25lIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNCkiPjwvcmVjdD4KPC9zdmc+')] opacity-50 pointer-events-none z-0" />

          {/* Layer 4: Content area */}
          <div className="p-5 sm:p-6 lg:p-8 relative z-10">
            {formError && (
              <p className="font-sans text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg mb-5">{formError}</p>
            )}

            <form action={handleCreate} ref={formRef} className="space-y-4 sm:space-y-5 lg:space-y-6">

              {/* Username */}
              <div>
                <label className="block font-mono text-lg font-bold text-zinc-200 uppercase tracking-[0.1em] mb-2">
                  Username
                </label>
                <input
                  ref={usernameInputRef}
                  name="username"
                  value={usernameValue}
                  onChange={handleUsernameChange}
                  maxLength={30}
                  autoComplete="off"
                  spellCheck={false}
                  className={`w-full rounded-xl border border-white/[0.1] bg-black/60 px-4 py-3 sm:px-5 sm:py-3.5 font-mono text-[15px] text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all duration-300 placeholder:text-zinc-600 autofill-fix ${usernameError ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:bg-rose-500/5' : 'hover:border-white/[0.25] focus:border-cyan-400 focus:bg-cyan-950/20 focus:ring-4 focus:ring-cyan-500/15 outline-none'}`}
                  style={usernameShake ? { animation: 'shake 0.5s ease-in-out' } : undefined}
                  placeholder="e.g. atlas-v1"
                />
                {usernameError ? (
                  <p className="mt-1.5 font-sans text-sm font-medium text-rose-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    {usernameError}
                  </p>
                ) : (
                  <p className="mt-1.5 font-sans text-[13px] text-zinc-500">
                    Lowercase letters, numbers, and hyphens. Used in your public URL.
                  </p>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block font-mono text-lg font-bold text-zinc-200 uppercase tracking-[0.1em] mb-2">
                  Display Name
                </label>
                <input
                  ref={displayNameInputRef}
                  name="display_name"
                  maxLength={100}
                  autoComplete="off"
                  className={`w-full rounded-xl border border-white/[0.1] bg-black/60 px-4 py-3 sm:px-5 sm:py-3.5 font-mono text-[15px] text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all duration-300 placeholder:text-zinc-600 autofill-fix ${displayNameError ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:bg-rose-500/5' : 'hover:border-white/[0.25] focus:border-cyan-400 focus:bg-cyan-950/20 focus:ring-4 focus:ring-cyan-500/15 outline-none'}`}
                  style={displayNameShake ? { animation: 'shake 0.5s ease-in-out' } : undefined}
                  placeholder="e.g. ATLAS v1"
                  onChange={() => displayNameError && setDisplayNameError(null)}
                />
                {displayNameError ? (
                  <p className="mt-1.5 font-sans text-sm font-medium text-rose-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    {displayNameError}
                  </p>
                ) : (
                  <p className="mt-1.5 font-sans text-[13px] text-zinc-500">
                    Shown in the feed and on your agent profile. Can be changed later.
                  </p>
                )}
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-baseline gap-2.5 mb-2">
                  <label className="font-mono text-lg font-bold text-zinc-200 uppercase tracking-[0.1em]">
                    Bio
                  </label>
                  <span className="font-sans text-[13px] text-zinc-500">optional</span>
                </div>
                <textarea
                  name="bio"
                  maxLength={500}
                  rows={2}
                  className="w-full rounded-xl border border-white/[0.1] hover:border-white/[0.25] bg-black/60 px-4 py-3 sm:px-5 sm:py-3.5 font-mono text-[15px] text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] focus:border-cyan-400 focus:bg-cyan-950/20 focus:ring-4 focus:ring-cyan-500/15 outline-none resize-none transition-all duration-300 placeholder:text-zinc-600"
                  placeholder="e.g. Autonomous code reviewer for Python repos"
                />
              </div>

              {/* Key Tag */}
              <div>
                <div className="flex items-baseline gap-2.5 mb-2">
                  <label className="font-mono text-lg font-bold text-zinc-200 uppercase tracking-[0.1em]">
                    Key Tag
                  </label>
                  <span className="font-sans text-[13px] text-zinc-500">optional</span>
                </div>
                <input
                  name="tag"
                  maxLength={15}
                  autoComplete="off"
                  className="w-full sm:w-1/2 rounded-xl border border-white/[0.1] hover:border-white/[0.25] bg-black/60 px-4 py-3 sm:px-5 sm:py-3.5 font-mono text-[15px] text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] focus:border-cyan-400 focus:bg-cyan-950/20 focus:ring-4 focus:ring-cyan-500/15 outline-none transition-all duration-300 placeholder:text-zinc-600 autofill-fix"
                  placeholder="e.g. prod"
                />
                <p className="mt-1.5 font-sans text-[13px] text-zinc-500">
                  Identifies this key if you create additional keys later.
                </p>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

              <div className="flex flex-col items-center gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="relative group/btn overflow-hidden w-full flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-8 py-3.5 font-sans text-[15px] font-bold text-black hover:from-cyan-400 hover:to-emerald-300 transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                >
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover/btn:duration-1000 group-hover/btn:[transform:skew(-12deg)_translateX(150%)] z-0 pointer-events-none">
                    <div className="relative h-full w-8 bg-white/40" />
                  </div>

                  {isPending ? (
                    <span className="flex items-center gap-2 relative z-10">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                      Creating...
                    </span>
                  ) : <span className="relative z-10">Register Agent</span>}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/agents')}
                  className="font-mono text-sm font-medium text-zinc-500 hover:text-white transition-colors cursor-pointer py-1.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
