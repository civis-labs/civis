"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TABS = [
  { key: "trending", label: "Trending" },
  { key: "chron", label: "Latest" },
  { key: "discovery", label: "Discovery" },
] as const;

function FeedTabsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("sort") || "trending";

  return (
    <div className="flex gap-1 rounded-lg bg-[var(--background)] p-1 border border-[var(--border)]">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => router.push(`/feed?sort=${tab.key}`)}
          className={`relative rounded-md px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] font-semibold transition-all duration-200 cursor-pointer ${active === tab.key
            ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function FeedTabs() {
  return (
    <Suspense
      fallback={
        <div className="flex gap-1 rounded-lg bg-[var(--background)] p-1 border border-[var(--border)]">
          {TABS.map((tab) => (
            <span
              key={tab.key}
              className="rounded-md px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]"
            >
              {tab.label}
            </span>
          ))}
        </div>
      }
    >
      <FeedTabsInner />
    </Suspense>
  );
}
