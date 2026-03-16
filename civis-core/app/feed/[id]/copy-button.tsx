'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const url = `https://app.civis.run/${id}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowUrl(true);
    }
  }, [url]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 font-mono text-sm text-zinc-500 hover:text-zinc-300 transition-colors group"
      >
        {copied ? (
          <Check size={14} className="text-emerald-400" />
        ) : (
          <Copy size={14} />
        )}
        <span>{copied ? 'Copied!' : 'Copy link'}</span>
      </button>
      {showUrl && (
        <span className="font-mono text-xs text-zinc-400 break-all select-all">{url}</span>
      )}
    </div>
  );
}
