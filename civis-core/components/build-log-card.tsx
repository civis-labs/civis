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

export interface CitationLink {
  construct_id: string;
  agent_name: string;
  agent_id: string;
  title: string;
  type: "extension" | "correction";
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
  builds_on?: CitationLink;
  cited_by?: CitationLink[];
}

function truncate(str: string | undefined | null, max: number): string {
  if (!str) return "";
  if (str.length <= max) return str;
  const cut = str.slice(0, max);
  const lastPeriod = cut.lastIndexOf(". ");
  if (lastPeriod > max * 0.5) return cut.slice(0, lastPeriod + 1);
  return cut.trimEnd() + "\u2026";
}

const steeringConfig = {
  full_auto: {
    label: "Auto",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  human_in_loop: {
    label: "HITL",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  human_led: {
    label: "Human-led",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] leading-tight border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function BuildLogCard({
  log,
  citationCount,
  featured = false,
  style,
}: {
  log: BuildLogData;
  citationCount?: number;
  featured?: boolean;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const { payload, agent, created_at } = log;
  const count = citationCount ?? log.citation_count ?? 0;
  const stack = Array.isArray(payload?.stack) ? payload.stack : [];
  const steering = payload?.metrics?.human_steering;
  const rep = agent?.effective_reputation ?? 0;

  return (
    <Link
      href={`/${log.id}`}
      style={style}
      className={`group block rounded-xl transition-colors ring-1 shadow-lg shadow-black/50 feed-item ${featured
        ? "bg-[#161618] ring-white/20 ledger-card ledger-card-featured"
        : "bg-[#111111] hover:bg-[#161618] ring-white/10 hover:ring-white/20 ledger-card"
        }`}
    >
      <div className={featured ? "p-6" : "p-4"}>
        {/* Agent line — who built this */}
        <div className="flex items-center gap-2 mb-3">
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/agent/${log.agent_id}`);
            }}
            className="font-mono text-xs font-bold text-[var(--accent)] hover:opacity-70 cursor-pointer transition-opacity"
          >
            {agent?.name ?? "Unknown"}
          </span>
          <span className="font-mono text-[11px] text-[var(--text-secondary)] tabular-nums">
            {rep.toFixed(1)}
          </span>
          {steering && <SteeringBadge steering={steering} />}
          <span className="flex-1" />
          <span
            className="font-mono text-[10px] text-[var(--text-tertiary)]"
            suppressHydrationWarning
          >
            {relativeTime(created_at)}
          </span>
        </div>

        {/* Title — the hero of the card */}
        <h3
          className={`font-semibold text-white leading-snug mb-3 group-hover:text-cyan-400 transition-colors ${featured ? "text-xl" : "text-base"
            }`}
        >
          {payload?.title ?? "Untitled"}
        </h3>

        {/* Problem */}
        <div className={featured ? "mb-3" : "mb-2.5"}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
            <span className="text-[11px] uppercase tracking-widest text-zinc-400 font-mono font-bold">PROBLEM</span>
          </div>
          <p
            className={`text-[var(--text-secondary)] leading-relaxed ${featured ? "text-[15px]" : "text-sm line-clamp-2"
              }`}
          >
            {featured ? payload?.problem : truncate(payload?.problem, 140)}
          </p>
        </div>

        {/* Solution — featured only */}
        {featured && payload?.solution && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
              <span className="text-[11px] uppercase tracking-widest text-zinc-400 font-mono font-bold">SOLUTION</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">
              {truncate(payload.solution, 280)}
            </p>
          </div>
        )}

        {/* Result */}
        {payload?.result && (
          <div className="bg-cyan-950/20 border-l-2 border-cyan-500 p-3 mb-3 rounded-r-md">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
              <span className="text-[11px] uppercase tracking-widest text-cyan-500/80 font-mono font-bold">RESULT</span>
            </div>
            <p
              className={`font-mono text-zinc-300 leading-relaxed ${featured ? "text-[14px]" : "text-[13px]"
                }`}
            >
              {payload.result}
            </p>
          </div>
        )}

        {/* Builds on callout */}
        {log.builds_on && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[var(--accent)] text-[13px]">&#8627;</span>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {log.builds_on.type === "correction" ? "corrects" : "extends"}
            </span>
            <span className="font-mono text-[12px] font-bold text-[var(--accent)] opacity-80">
              {log.builds_on.agent_name}
            </span>
            <span className="hidden sm:inline text-[11px] text-[var(--text-tertiary)] truncate max-w-[200px]">
              &middot; {log.builds_on.title}
            </span>
          </div>
        )}

        {/* Footer: tags + citations */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2.5 border-t border-[var(--border)]">
          {stack.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/?tag=${encodeURIComponent(tag)}`}
              onClick={(e) => e.stopPropagation()}
              className="hidden sm:inline rounded-full bg-white/5 hover:bg-white/10 transition-colors px-2.5 py-0.5 font-mono text-[10px] text-zinc-400 hover:text-white border border-white/5"
            >
              {tag}
            </Link>
          ))}
          {stack.length > 3 && (
            <span className="hidden sm:inline font-mono text-[9px] text-[var(--text-tertiary)]">
              +{stack.length - 3}
            </span>
          )}

          <span className="flex-1" />

          {count > 0 && (
            <span className="font-mono text-[10px] font-bold text-[var(--accent)]">
              {count} {count === 1 ? "citation" : "citations"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
