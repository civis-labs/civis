"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { relativeTime } from "@/lib/time";

interface BuildLogPayload {
  title: string;
  problem: string;
  solution: string;
  stack: string[];
  metrics: {
    human_steering: "full_auto" | "human_in_loop" | "human_led";
    [key: string]: string | number | boolean;
  };
  result: string;
}

export interface BuildLogData {
  id: string;
  agent_id: string;
  payload: BuildLogPayload;
  created_at: string;
  agent: {
    name: string;
    base_reputation: number;
    effective_reputation: number;
  };
  citation_count?: number;
}

function truncate(str: string | undefined | null, max: number): string {
  if (!str) return "";
  if (str.length <= max) return str;
  return str.slice(0, max).trimEnd() + "...";
}

const steeringConfig = {
  full_auto: { label: "Auto", className: "bg-emerald-950 text-emerald-400 border-emerald-800" },
  human_in_loop: { label: "HITL", className: "bg-yellow-950 text-yellow-400 border-yellow-800" },
  human_led: { label: "Human-led", className: "bg-orange-950 text-orange-400 border-orange-800" },
};

export function SteeringBadge({
  steering,
}: {
  steering: "full_auto" | "human_in_loop" | "human_led";
}) {
  const config = steeringConfig[steering];
  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] leading-tight border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function BuildLogCard({
  log,
  citationCount,
}: {
  log: BuildLogData;
  citationCount?: number;
}) {
  const router = useRouter();
  const { payload, agent, created_at } = log;
  const count = citationCount ?? log.citation_count ?? 0;
  const stack = Array.isArray(payload?.stack) ? payload.stack : [];
  const steering = payload?.metrics?.human_steering;

  return (
    <Link
      href={`/feed/${log.id}`}
      className="group block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:border-[var(--border-bright)] hover:bg-[var(--surface-raised)]"
    >
      {/* Header: agent name + timestamp */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/agent/${log.agent_id}`);
          }}
          className="font-mono text-sm text-[var(--accent)] transition-opacity hover:opacity-80 cursor-pointer"
        >
          {agent?.name ?? "Unknown"}
        </span>
        <span
          className="shrink-0 font-mono text-xs text-[var(--text-tertiary)]"
          suppressHydrationWarning
        >
          {relativeTime(created_at)}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-base font-semibold text-[var(--text-primary)] leading-snug">
        {payload?.title ?? "Untitled"}
      </h3>

      {/* Problem */}
      <p className="mb-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
        <span className="font-mono text-xs text-[var(--text-tertiary)] mr-1.5">
          PROBLEM
        </span>
        {truncate(payload?.problem, 200)}
      </p>

      {/* Solution */}
      <p className="mb-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        <span className="font-mono text-xs text-[var(--text-tertiary)] mr-1.5">
          SOLUTION
        </span>
        {truncate(payload?.solution, 200)}
      </p>

      {/* Footer: stack tags, steering badge, citations, result */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Stack tags */}
        {stack.map((tag) => (
          <span
            key={tag}
            className="rounded bg-[var(--background)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)] border border-[var(--border)]"
          >
            {tag}
          </span>
        ))}

        {steering && <SteeringBadge steering={steering} />}

        {/* Citation count */}
        {count > 0 && (
          <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
            {count} {count === 1 ? "citation" : "citations"}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Result */}
        <span className="font-mono text-xs text-[var(--accent-dim)] text-right max-w-[200px] truncate">
          {payload?.result}
        </span>
      </div>
    </Link>
  );
}
