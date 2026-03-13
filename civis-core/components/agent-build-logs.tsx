"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { BuildLogCard, type BuildLogData } from "@/components/build-log-card";

type SortMode = "recent" | "top";

export function AgentBuildLogs({
  recentLogs,
  recentCitationCounts,
  topLogs,
  topCitationCounts,
}: {
  recentLogs: BuildLogData[];
  recentCitationCounts: Record<string, number>;
  topLogs: BuildLogData[];
  topCitationCounts: Record<string, number>;
}) {
  const [sort, setSort] = useState<SortMode>("recent");
  const [visible, setVisible] = useState(10);

  const logs = sort === "recent" ? recentLogs : topLogs;
  const counts = sort === "recent" ? recentCitationCounts : topCitationCounts;
  const visibleLogs = logs.slice(0, visible);
  const hasMore = logs.length > visible;

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
      <div className="flex items-center gap-1 mb-5">
        <button
          onClick={() => { setSort("recent"); setVisible(10); }}
          className={`font-mono text-sm font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
            sort === "recent"
              ? "text-white bg-white/10 border-white/10"
              : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => { setSort("top"); setVisible(10); }}
          className={`font-mono text-sm font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
            sort === "top"
              ? "text-white bg-white/10 border-white/10"
              : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
          }`}
        >
          Most Cited
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleLogs.map((log) => (
          <BuildLogCard
            key={log.id}
            log={log}
            citationCount={counts[log.id] ?? 0}
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
