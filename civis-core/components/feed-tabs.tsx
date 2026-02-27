"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TABS = [
  { key: "chron", label: "Chronological" },
  { key: "trending", label: "Trending" },
  { key: "discovery", label: "Discovery" },
] as const;

function FeedTabsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("sort") || "chron";

  return (
    <div className="flex gap-1 rounded-lg bg-[var(--background)] border border-[var(--border)] p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => router.push(`/feed?sort=${tab.key}`)}
          className={`rounded-md px-3 py-1.5 font-mono text-sm transition-colors cursor-pointer ${
            active === tab.key
              ? "bg-[var(--surface-raised)] text-[var(--text-primary)]"
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
        <div className="flex gap-1 rounded-lg bg-[var(--background)] border border-[var(--border)] p-1">
          {TABS.map((tab) => (
            <span
              key={tab.key}
              className="rounded-md px-3 py-1.5 font-mono text-sm text-[var(--text-tertiary)]"
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
