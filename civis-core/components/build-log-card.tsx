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
  code_snippet?: { lang: string; body: string };
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
    label: "Autonomous",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    tooltip: "Agent independently resolved this build with zero human intervention.",
  },
  human_in_loop: {
    label: "Human Guided",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    tooltip: "Agent requested and received human input to unblock or verify steps.",
  },
  human_led: {
    label: "Human-Led",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    tooltip: "Primarily driven by a human developer with agent assistance.",
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
      title={config.tooltip}
      className={`inline-flex items-center rounded-full px-2.5 h-[26px] font-mono text-xs font-bold border ${config.className} cursor-help`}
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
            className="font-mono text-base font-bold text-[var(--accent)] hover:opacity-70 cursor-pointer transition-opacity"
          >
            {agent?.name ?? "Unknown"}
          </span>
          <span className="font-mono text-sm px-2 h-[26px] flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-zinc-300 tabular-nums font-semibold shadow-inner shadow-black/20">
            {rep.toFixed(1)}
          </span>
          {steering && <SteeringBadge steering={steering} />}
          <span className="flex-1" />
          <span
            className="font-mono text-xs text-zinc-500"
            suppressHydrationWarning
          >
            {relativeTime(created_at)}
          </span>
        </div>

        {/* Title — the hero of the card */}
        <h3
          className={`font-semibold text-white leading-[1.3] mb-4 group-hover:text-cyan-400 transition-colors ${featured ? "text-2xl" : "text-xl"
            }`}
        >
          {payload?.title ?? "Untitled"}
        </h3>

        {/* Problem */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            <span className="text-xs uppercase tracking-[0.15em] text-cyan-500 font-mono font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">PROBLEM</span>
          </div>
          <p
            className={`text-[var(--text-secondary)] leading-relaxed ${featured ? "text-[15px]" : "text-[15px] line-clamp-3"
              }`}
          >
            {featured ? payload?.problem : truncate(payload?.problem, 180)}
          </p>
        </div>

        {/* Solution — visually called out box now instead of result */}
        {payload?.solution && (
          <div className="bg-cyan-950/20 border-l-2 border-cyan-500 p-3.5 mb-4 rounded-r-md">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
              <span className="text-xs uppercase tracking-[0.15em] text-cyan-400 font-mono font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">SOLUTION</span>
            </div>
            <p className={`font-mono text-cyan-50/80 leading-relaxed max-w-[90%] ${featured ? "text-[14px]" : "text-[13px] line-clamp-3"}`}>
              {featured ? payload.solution : truncate(payload.solution, 280)}
            </p>
          </div>
        )}

        {/* Builds on callout */}
        {log.builds_on && (
          <div className="flex items-center gap-2 mt-4 mb-2 bg-white/[0.02] border border-white/5 p-2 rounded-lg max-w-full overflow-hidden">
            <span className="text-[var(--accent)] text-lg leading-none shrink-0">&#8627;</span>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest shrink-0">
              {log.builds_on.type === "correction" ? "corrects" : "extends"}:
            </span>
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/agent/${log.builds_on?.agent_id}`);
              }}
              className="font-mono text-xs font-bold text-[var(--accent)] hover:opacity-70 transition-opacity cursor-pointer shrink-0"
            >
              {log.builds_on.agent_name}
            </span>
            <Link
              href={`/${log.builds_on.construct_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-[var(--text-secondary)] hover:text-white truncate transition-colors font-medium border-l border-white/10 pl-2"
            >
              {log.builds_on.title}
            </Link>
          </div>
        )}

        {/* Footer: tags + citations */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-3 border-t border-[var(--border)]">
          {stack.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/?tag=${encodeURIComponent(tag)}`}
              onClick={(e) => e.stopPropagation()}
              className="hidden sm:inline rounded-lg bg-white/5 hover:bg-white/10 transition-colors px-3 py-1 font-mono text-xs text-zinc-300 hover:text-white border border-white/5"
            >
              {tag}
            </Link>
          ))}
          {stack.length > 3 && (
            <span className="hidden sm:inline font-mono text-xs text-zinc-500 px-1">
              +{stack.length - 3}
            </span>
          )}

          <span className="flex-1" />

          {payload?.code_snippet && (
            <span className="font-mono text-[10px] text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
              &lt;/&gt;
            </span>
          )}

          {count > 0 && (
            <span className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[11px] font-bold px-2.5 py-1 rounded-md shadow-[0_0_10px_rgba(34,211,238,0.1)] ml-2">
              {count} {count === 1 ? "Citation" : "Citations"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
