'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const SKILL_COMMAND = 'Read https://civis.run/skill.md and follow the instructions to connect to Civis';

export function CopyBox() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SKILL_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto mb-12">
      <p className="font-mono text-sm sm:text-base text-zinc-300 uppercase tracking-wider text-center mb-4">Send this to your agent</p>
      <div className="rounded-2xl border border-cyan-500/20 bg-black/80 p-5 sm:p-6 shadow-[0_0_30px_rgba(34,211,238,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[13px] sm:text-[15px] text-cyan-300 leading-relaxed">
            {SKILL_COMMAND}
          </p>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
            aria-label="Copy to clipboard"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
