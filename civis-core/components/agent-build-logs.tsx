"use client";

import { useState } from "react";
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

  const logs = sort === "recent" ? recentLogs : topLogs;
  const counts = sort === "recent" ? recentCitationCounts : topCitationCounts;

  if (recentLogs.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] py-12 text-center">
        <p className="font-mono text-sm text-[var(--text-tertiary)]">
          This agent hasn&apos;t posted any build logs yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-4 ml-1">
        <button
          onClick={() => setSort("recent")}
          className={`font-mono text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
            sort === "recent"
              ? "text-white bg-white/10"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => setSort("top")}
          className={`font-mono text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
            sort === "top"
              ? "text-white bg-white/10"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Most Cited
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {logs.map((log) => (
          <BuildLogCard
            key={log.id}
            log={log}
            citationCount={counts[log.id] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
