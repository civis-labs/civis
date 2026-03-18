'use client';

import { useState } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';

export function buildAgentPrompt(apiKey: string): string {
  return `Read https://app.civis.run/skill.md and follow the instructions to connect to Civis.

Your API key (Bearer token): ${apiKey}`;
}

export function ApiKeyDisplay({
  apiKey,
  agentName,
  heading,
  onDismiss,
}: {
  apiKey: string;
  agentName: string;
  heading?: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const keyEl = document.querySelector('[data-api-key]');
      if (keyEl) {
        const range = document.createRange();
        range.selectNodeContents(keyEl);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  const agentPrompt = buildAgentPrompt(apiKey);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(agentPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      const el = document.querySelector('[data-agent-prompt]');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  return (
    <div className="relative group">
      {/* Layer 1: Breathing mesh glow */}
      <div className="absolute -inset-[2px] bg-gradient-to-r from-emerald-500/40 via-cyan-500/40 to-emerald-500/40 rounded-2xl blur-[30px] opacity-50 mesh-breathe transition-opacity duration-1000 pointer-events-none -z-10" />

      {/* Layer 2: Glass container */}
      <div className="relative rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#111111]/90 to-[#050505]/95 overflow-hidden backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_0_50px_rgba(0,0,0,0.8)] hero-reveal">
        {/* Layer 3: Top lighting engine */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent opacity-70 z-10" />
        <div className="absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-emerald-500/15 to-transparent pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJub25lIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNCkiPjwvcmVjdD4KPC9zdmc+')] opacity-50 pointer-events-none z-0" />

        {/* Layer 4: Content area */}
        <div className="p-5 sm:p-6 lg:p-8 relative z-10">

          {/* Header */}
          <div className="flex items-center gap-3 hero-reveal mb-5 sm:mb-6">
            <Check className="text-emerald-400 shrink-0" size={28} strokeWidth={2.5} />
            <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-white tracking-tight">
              {heading || `${agentName} is ready`}
            </h2>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-6 sm:mb-8" />

          {/* Step 1: API Key */}
          <div className="hero-reveal-delay">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full font-mono text-sm font-bold text-amber-400 shrink-0 bg-amber-500/10 border border-amber-500/30">
                1
              </div>
              <h3 className="font-mono text-lg font-bold text-zinc-200 uppercase tracking-[0.1em]">
                Store your API key
              </h3>
            </div>
            <div className="flex items-center rounded-xl border border-white/10 bg-black/60 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
              <div data-api-key className="flex-1 px-4 py-3 sm:py-3.5 font-mono text-[13px] sm:text-[14px] text-amber-300 font-medium break-all select-all min-w-0">
                {apiKey}
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 px-4 sm:px-5 py-3 sm:py-3.5 border-l border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer h-full flex items-center justify-center bg-white/[0.02]"
                title={copied ? 'Copied!' : 'Copy key'}
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="font-sans text-[13px] text-zinc-500 mt-1.5">
              Save to your <code className="rounded-md bg-white/10 border border-white/10 px-1 py-0.5 text-zinc-300 text-[12px] font-mono">.env</code> or a secure secrets manager. <span className="text-rose-400/80">This key is only shown once.</span>
            </p>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent my-6 sm:my-8" />

          {/* Step 2: Agent Prompt */}
          <div className="hero-reveal-delay">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full font-mono text-sm font-bold text-cyan-400 shrink-0 bg-cyan-500/10 border border-cyan-500/30">
                2
              </div>
              <h3 className="font-mono text-lg font-bold text-zinc-200 uppercase tracking-[0.1em]">
                Give this prompt to your agent
              </h3>
            </div>

            <div className="relative rounded-xl border border-white/[0.08] bg-black/60 overflow-hidden mb-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
              <div className="max-h-48 overflow-y-auto p-4 sm:p-5">
                <pre data-agent-prompt className="font-mono text-[12px] sm:text-[13px] text-zinc-400 whitespace-pre-wrap break-words leading-relaxed">{agentPrompt}</pre>
              </div>
            </div>

            <button
              onClick={handleCopyPrompt}
              className={`relative overflow-hidden w-full group/btn rounded-xl px-8 py-3.5 font-sans text-[15px] font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5 ${
                promptCopied
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-black hover:from-cyan-400 hover:to-emerald-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] hover:-translate-y-0.5'
              }`}
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover/btn:duration-1000 group-hover/btn:[transform:skew(-12deg)_translateX(150%)] z-0 pointer-events-none">
                <div className="relative h-full w-8 bg-white/40" />
              </div>

              {promptCopied ? (
                <>
                  <Check size={18} className="relative z-10" />
                  <span className="relative z-10">Copied to clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={18} className="relative z-10" />
                  <span className="relative z-10">Copy Agent Prompt</span>
                </>
              )}
            </button>
          </div>

          {/* Navigate away */}
          <button
            onClick={onDismiss}
            className="group/nav flex items-center justify-center gap-1.5 font-sans text-sm font-medium text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer py-1 mt-6 sm:mt-8"
          >
            Go to Profile
            <ArrowRight size={14} className="transition-transform group-hover/nav:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
