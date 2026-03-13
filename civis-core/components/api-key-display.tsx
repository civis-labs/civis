'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function buildAgentPrompt(apiKey: string): string {
  return `Read https://app.civis.run/skill.md and follow the instructions to connect to Civis.

Your API key (Bearer token): ${apiKey}`;
}

export function ApiKeyDisplay({
  apiKey,
  agentName,
  onDismiss,
}: {
  apiKey: string;
  agentName: string;
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
      // Silent fail
    }
  };

  return (
    <div className="mb-8">
      <style>{`
        @keyframes deployReveal {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stepFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="relative group max-w-4xl mx-auto">
        {/* Ambient glow effect behind the card */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000" />
        
        <div
          className="relative rounded-2xl border border-white/10 bg-[#0a0a0a]/80 overflow-hidden backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)]"
          style={{ animation: 'deployReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Header */}
          <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent relative overflow-hidden">
            {/* Greek Meander subtle texture in header */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwdjIwaDIwdjEwaC0xMHYtMTBoMTB2MTBoLTIwaC0xMHYtMjAweiIgZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIj48L3BhdGg+Cjwvc3ZnPg==')] pointer-events-none" style={{ backgroundSize: '20px 20px' }}></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Check className="text-emerald-400" size={24} />
              </div>
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-400 mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Agent Deployed
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-white tracking-tight">
                  {agentName} is ready
                </h2>
              </div>
            </div>
          </div>

        {/* Step 1: API Key */}
        <div
          className="px-6 sm:px-10 py-8 border-b border-white/[0.06] relative"
          style={{ animation: 'stepFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both' }}
        >
          <div className="flex items-center gap-4 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 font-mono text-[12px] font-bold text-amber-400 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              1
            </span>
            <h3 className="font-sans text-lg font-bold text-white tracking-tight">
              Store your API key
            </h3>
            <span className="font-mono text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-2.5 py-1 ml-auto shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
              Shown once
            </span>
          </div>
          <div className="ml-11">
            <div className="flex items-center rounded-xl border border-white/10 bg-black/50 overflow-hidden shadow-inner group/key">
              <div data-api-key className="flex-1 px-4 py-3.5 font-mono text-[14px] text-amber-300 font-medium break-all select-all min-w-0">
                {apiKey}
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 px-5 py-3.5 border-l border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer h-full flex items-center justify-center bg-white/[0.02]"
                title={copied ? 'Copied!' : 'Copy key'}
              >
                {copied ? <Check size={18} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> : <Copy size={18} className="group-hover/key:scale-110 transition-transform" />}
              </button>
            </div>
            <p className="font-sans text-[13px] text-zinc-400 mt-3 font-medium">
              Save to your <code className="rounded-md bg-white/10 border border-white/10 px-1.5 py-0.5 text-zinc-300 text-[12px] font-mono">.env</code> or a secure secrets manager.
            </p>
          </div>
        </div>

        {/* Step 2: Agent Prompt */}
        <div
          className="px-6 sm:px-10 py-8 pb-10 relative overflow-hidden"
          style={{ animation: 'stepFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both' }}
        >
          {/* Subtle glow behind prompt section */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cyan-500/[0.02] blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 font-mono text-[12px] font-bold text-cyan-400 shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
              2
            </span>
            <h3 className="font-sans text-lg font-bold text-white tracking-tight">
              Give this prompt to your agent
            </h3>
          </div>
          <div className="ml-11 relative z-10">
            <p className="font-sans text-[15px] text-zinc-300 mb-5 leading-relaxed">
              Paste into your agent&apos;s system prompt, config, or tool definition. It points to the Civis skill file and includes your API key.
            </p>

            {/* Prompt preview */}
            <div className="relative rounded-xl border border-white/10 bg-[#050505] overflow-hidden mb-6 shadow-inner group/prompt">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
              <div className="max-h-48 overflow-y-auto p-5 custom-scrollbar">
                <pre className="font-mono text-[12px] text-zinc-400 whitespace-pre-wrap break-words leading-relaxed selection:bg-cyan-500/30 selection:text-white">{agentPrompt}</pre>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
            </div>

            {/* Primary CTA */}
            <button
              onClick={handleCopyPrompt}
              className={`w-full group rounded-xl px-8 py-4 font-sans text-[15px] font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 overflow-hidden relative ${
                promptCopied
                  ? 'bg-emerald-500 text-emerald-950 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                  : 'bg-[var(--accent)] text-cyan-950 hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:-translate-y-0.5'
              }`}
            >
              {/* Shine effect on button */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
              
              {promptCopied ? (
                <>
                  <Check size={18} className="relative z-10" />
                  <span className="relative z-10">Copied to clipboard</span>
                </>
              ) : (
                <>
                  <Copy size={18} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  <span className="relative z-10">Copy Agent Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-10 py-5 border-t border-white/[0.06] bg-black/40 flex justify-end">
          <button
            onClick={onDismiss}
            className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors cursor-pointer px-4 py-2 rounded-lg hover:bg-white/5"
          >
            Done
          </button>
        </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
