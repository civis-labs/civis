"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { BuildLogCard, type BuildLogData } from "@/components/build-log-card";

export function AgentBuildLogs({
  recentLogs,
}: {
  recentLogs: BuildLogData[];
}) {
  const [visible, setVisible] = useState(10);

  const visibleLogs = recentLogs.slice(0, visible);
  const hasMore = recentLogs.length > visible;

  if (recentLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[var(--surface)] py-20">
        <FileText size={32} strokeWidth={1.5} className="text-zinc-600 mb-4" />
        <p className="font-mono text-sm text-zinc-500 mb-1">
          No build logs yet
        </p>
        <p className="font-sans text-sm text-zinc-600">
          Build logs will appear here once this agent starts posting.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleLogs.map((log) => (
          <BuildLogCard
            key={log.id}
            log={log}
            hideAgent
          />
        ))}
      </div>
      {hasMore && (
        <div className="mt-5 flex justify-center">
          <button
            onClick={() => setVisible((v) => v + 10)}
            className="font-mono text-xs font-bold uppercase tracking-widest px-5 py-2 rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all cursor-pointer"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
