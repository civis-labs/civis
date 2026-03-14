"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { BuildLogCard, type BuildLogData } from "@/components/build-log-card";
import { FeedTabs } from "@/components/feed-tabs";

interface FeedClientProps {
  initialLogs: BuildLogData[];
  initialCitationCounts: Record<string, number>;
  initialSort: string;
  initialTag: string | null;
}

export function FeedClient({
  initialLogs,
  initialCitationCounts,
  initialSort,
  initialTag,
  sidebar,
}: FeedClientProps & { sidebar?: React.ReactNode }) {
  const [sort, setSort] = useState(initialSort);
  const [tag, setTag] = useState(initialTag);
  const [logs, setLogs] = useState(initialLogs);
  const [citationCounts, setCitationCounts] = useState(initialCitationCounts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialLogs.length === 20);
  const [isSwitching, startSwitchTransition] = useTransition();
  const [isLoadingMore, startLoadMoreTransition] = useTransition();
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const latestTimestampRef = useRef(initialLogs[0]?.created_at ?? null);

  const fetchFeed = useCallback(
    async (newSort: string, newTag: string | null, newPage: number) => {
      const tagParam = newTag ? `&tag=${encodeURIComponent(newTag)}` : "";
      const res = await fetch(
        `/api/internal/feed?sort=${newSort}&page=${newPage}&limit=20${tagParam}`
      );
      if (!res.ok) return null;
      return res.json();
    },
    []
  );

  const fetchCitations = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return {};
    const res = await fetch("/api/internal/citation-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) return {};
    const json = await res.json();
    return json.counts as Record<string, number>;
  }, []);

  // Poll for new posts every 60s
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug_banner") === "true") {
      setNewPostsAvailable(true);
      return;
    }

    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/internal/feed/latest");
        if (!res.ok) return;
        const { latest } = await res.json();
        if (
          latest &&
          (!latestTimestampRef.current || latest > latestTimestampRef.current)
        ) {
          setNewPostsAvailable(true);
        }
      } catch {
        // Silent fail, retry next interval
      }
    };

    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);

  function handleRefresh() {
    setNewPostsAvailable(false);
    startSwitchTransition(async () => {
      const json = await fetchFeed(sort, tag, 1);
      if (!json) return;
      const newLogs = json.data as BuildLogData[];
      const counts = await fetchCitations(newLogs.map((l) => l.id));
      setLogs(newLogs);
      setCitationCounts(counts);
      setPage(1);
      setHasMore(newLogs.length === 20);
      if (newLogs[0]?.created_at) {
        latestTimestampRef.current = newLogs[0].created_at;
      }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSortChange(newSort: string) {
    if (newSort === sort) return;

    // Update URL without triggering server re-render
    const params = new URLSearchParams();
    params.set("sort", newSort);
    if (tag) params.set("tag", tag);
    window.history.replaceState(null, "", `/?${params.toString()}`);

    setSort(newSort);
    setNewPostsAvailable(false);
    startSwitchTransition(async () => {
      const json = await fetchFeed(newSort, tag, 1);
      if (!json) return;
      const newLogs = json.data as BuildLogData[];
      const counts = await fetchCitations(newLogs.map((l) => l.id));
      setLogs(newLogs);
      setCitationCounts(counts);
      setPage(1);
      setHasMore(newLogs.length === 20);
      if (newLogs[0]?.created_at) {
        latestTimestampRef.current = newLogs[0].created_at;
      }
    });
  }

  function handleClearTag() {
    const params = new URLSearchParams();
    if (sort !== "trending") params.set("sort", sort);
    window.history.replaceState(null, "", params.toString() ? `/?${params.toString()}` : "/");

    setTag(null);
    setNewPostsAvailable(false);
    startSwitchTransition(async () => {
      const json = await fetchFeed(sort, null, 1);
      if (!json) return;
      const newLogs = json.data as BuildLogData[];
      const counts = await fetchCitations(newLogs.map((l) => l.id));
      setLogs(newLogs);
      setCitationCounts(counts);
      setPage(1);
      setHasMore(newLogs.length === 20);
      if (newLogs[0]?.created_at) {
        latestTimestampRef.current = newLogs[0].created_at;
      }
    });
  }

  function loadMore() {
    const nextPage = page + 1;
    startLoadMoreTransition(async () => {
      const json = await fetchFeed(sort, tag, nextPage);
      if (!json) return;
      const newLogs = json.data as BuildLogData[];
      if (newLogs.length < 20) setHasMore(false);
      if (newLogs.length === 0) return;

      const counts = await fetchCitations(newLogs.map((l) => l.id));
      setCitationCounts((prev) => ({ ...prev, ...counts }));
      setLogs((prev) => [...prev, ...newLogs]);
      setPage(nextPage);
    });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-x-8 gap-y-0 relative">
      {/* Row 1: Header & Tabs (Left Col) */}
      <div className="xl:col-start-1 xl:col-end-2">
        {tag && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-2.5">
            <span className="font-mono text-xs text-[var(--text-secondary)]">
              Showing logs for:
            </span>
            <span className="rounded-full bg-[var(--accent)]/10 px-3 py-0.5 font-mono text-sm font-semibold text-[var(--accent)]">
              {tag}
            </span>
            <button
              onClick={handleClearTag}
              className="font-mono text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              &times; clear filter
            </button>
          </div>
        )}

        <div className="mt-20" />
      </div>

      {/* Row 2: Cards (Left Col) */}
      <div className="xl:col-start-1 xl:col-end-2 xl:row-start-2 flex-1 min-w-0 flex flex-col pb-12">

      {newPostsAvailable && !isSwitching && (
        <div className="flex justify-center mb-4 new-posts-banner">
          <button
            onClick={handleRefresh}
            className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_16px_rgba(34,211,238,0.15)] transition-all cursor-pointer new-posts-pill"
          >
            New posts available
          </button>
        </div>
      )}

      {/* Loading state for filter switch */}
      {isSwitching ? (
        <div className="flex flex-col items-center justify-center w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-20">
          <div className="relative flex flex-col items-center">
            {/* Translate slightly left to optically center over "Loading" instead of "Loading..." */}
            <div className="h-5 w-5 rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)] animate-spin mb-3 -translate-x-1.5" />
            <p className="font-mono text-sm text-[var(--text-tertiary)]">
              Loading...
            </p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] py-20">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            {tag ? `No build logs found for "${tag}"` : "No build logs posted yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Featured first card */}
          <div className="mb-4">
            <BuildLogCard
              key={logs[0].id}
              log={logs[0]}
              citationCount={citationCounts[logs[0].id] ?? 0}
              featured
              style={{ animationDelay: "0ms" }}
            />
          </div>

          {/* Rest */}
          {logs.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                disabled={isLoadingMore}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)] disabled:opacity-50 cursor-pointer"
              >
                {isLoadingMore ? "Loading\u2026" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
      </div>

      {/* Row 2: Sidebar (Right Col) */}
      {sidebar && (
        <div className="hidden xl:block xl:col-start-2 xl:col-end-3 xl:row-start-2 h-full">
          {sidebar}
        </div>
      )}
    </div>
  );
}
