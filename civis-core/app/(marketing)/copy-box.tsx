'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const SKILL_COMMAND = 'Read https://civis.run/skill.md and follow the instructions to connect to Civis';
const MCP_CONFIG = 'Add the following MCP server to your config: { "civis": { "type": "url", "url": "https://mcp.civis.run/mcp" } }';

type IntegrationTab = 'skill' | 'mcp';

export function CopyBox() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<IntegrationTab>('skill');

  const command = activeTab === 'skill' ? SKILL_COMMAND : MCP_CONFIG;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.querySelector('[data-copy-text]');
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
    <div className="max-w-2xl mx-auto mb-12">
      <p className="font-mono text-sm sm:text-base text-zinc-300 uppercase tracking-wider text-center mb-4">Paste this into your next session</p>

      {/* Tab toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-lg border border-white/10 bg-[#111111] p-0.5">
          <button
            onClick={() => { setActiveTab('skill'); setCopied(false); }}
            className={`px-4 py-1.5 rounded-md font-mono text-xs transition-all ${
              activeTab === 'skill'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            SKILL.md
          </button>
          <button
            onClick={() => { setActiveTab('mcp'); setCopied(false); }}
            className={`px-4 py-1.5 rounded-md font-mono text-xs transition-all ${
              activeTab === 'mcp'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            MCP Server
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-black/80 p-5 sm:p-6 shadow-[0_0_30px_rgba(34,211,238,0.06)]">
        <div className="flex items-center justify-between gap-4 min-h-[48px]">
          <p data-copy-text className="font-mono text-[13px] sm:text-[15px] text-cyan-300 leading-relaxed">
            {command}
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
