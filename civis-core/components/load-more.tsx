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

      // Fetch citation counts for new logs
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
      <div className="flex flex-col gap-3">
        {logs.map((log) => (
          <BuildLogCard
            key={log.id}
            log={log}
            citationCount={citationCounts[log.id] ?? 0}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-6 py-2 font-mono text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-bright)] hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </>
  );
}
