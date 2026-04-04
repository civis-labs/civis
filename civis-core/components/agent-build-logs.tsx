"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import { BuildLogCard } from "@/components/build-log-card";
import type { BuildLogData } from "@/lib/build-log-summary";
import { relativeTime } from "@/lib/time";
import { tagAccent } from "@/lib/tag-colors";
import { sortStackByPriority } from "@/lib/stack-taxonomy";

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

  const [first, ...rest] = visibleLogs;

  return (
    <div>
      {/* Latest build log, featured */}
      <BuildLogCard
        key={first.id}
        log={first}
        featured
        hideAgent
      />

      {/* Remaining logs as clean list */}
      {rest.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/10 bg-[var(--surface-raised)] overflow-hidden divide-y divide-white/[0.06]">
          {rest.map((log) => {
            const stack = sortStackByPriority(Array.isArray(log.payload?.stack) ? log.payload.stack : []);
            return (
              <Link
                key={log.id}
                href={`/${log.id}`}
                className="group flex items-start sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors"
              >
                {/* Color accent dot from primary stack tag */}
                <span
                  className="shrink-0 w-1.5 h-1.5 rounded-full mt-2.5 sm:mt-0"
                  style={{
                    backgroundColor: stack.length > 0
                      ? `rgba(${tagAccent(stack[0])}, 0.5)`
                      : 'rgba(255,255,255,0.15)',
                  }}
                />

                {/* Title */}
                <span className="flex-1 min-w-0 font-bold text-[17px] text-zinc-400 group-hover:text-white transition-colors leading-snug truncate">
                  {log.payload?.title ?? "Untitled"}
                </span>

                {/* Stack tags, right-aligned */}
                <div className="hidden sm:flex items-center justify-end gap-2 shrink-0">
                  {stack.slice(0, 1).map((tag) => {
                    const rgb = tagAccent(tag);
                    return (
                      <span
                        key={tag}
                        className="rounded-full px-2.5 py-1 text-sm font-mono border"
                        style={{
                          backgroundColor: `rgba(${rgb}, 0.06)`,
                          borderColor: `rgba(${rgb}, 0.12)`,
                          color: `rgba(${rgb}, 0.5)`,
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>

                {/* Time, fixed width so arrows align */}
                <span className="shrink-0 font-mono text-sm text-zinc-500 w-16 text-right" suppressHydrationWarning>
                  {relativeTime(log.created_at)}
                </span>

                {/* Arrow */}
                <ArrowRight size={16} strokeWidth={2} className="shrink-0 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all hidden sm:block" />
              </Link>
            );
          })}
        </div>
      )}
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
