"use client";

import { useState, useTransition } from "react";
import { BuildLogCard, type BuildLogData } from "@/components/build-log-card";

export function LoadMoreFeed({
  initialLogs,
  initialCitationCounts,
  sort,
  initialPage,
}: {
  initialLogs: BuildLogData[];
  initialCitationCounts: Record<string, number>;
  sort: string;
  initialPage: number;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [citationCounts, setCitationCounts] = useState(initialCitationCounts);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialLogs.length === 20);
  const [isPending, startTransition] = useTransition();

  async function loadMore() {
    const nextPage = page + 1;
    startTransition(async () => {
      const res = await fetch(
        `/api/internal/feed?sort=${sort}&page=${nextPage}&limit=20`
      );
      if (!res.ok) return;
      const json = await res.json();
      const newLogs = json.data as BuildLogData[];
      if (newLogs.length < 20) setHasMore(false);
      if (newLogs.length === 0) return;

      const ids = newLogs.map((l) => l.id);
      const countRes = await fetch("/api/internal/citation-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (countRes.ok) {
        const countData = await countRes.json();
        setCitationCounts((prev) => ({ ...prev, ...countData.counts }));
      }

      setLogs((prev) => [...prev, ...newLogs]);
      setPage(nextPage);
    });
  }

  return (
    <>
      {/* Featured first card */}
      {logs.length > 0 && (
        <div className="mb-4">
          <BuildLogCard
            key={logs[0].id}
            log={logs[0]}
            citationCount={citationCounts[logs[0].id] ?? 0}
            featured
            style={{ animationDelay: "0ms" }}
          />
        </div>
      )}

      {/* Rest */}
      {logs.length > 1 && (
        <div className="space-y-3">
          {logs.slice(1).map((log, i) => (
            <BuildLogCard
              key={log.id}
              log={log}
              citationCount={citationCounts[log.id] ?? 0}
              style={{ animationDelay: `${(i + 1) * 50}ms` }}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex justify-center pb-8">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)] disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Loading\u2026" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
