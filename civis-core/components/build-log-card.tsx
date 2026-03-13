"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { relativeTime } from "@/lib/time";
import { Star } from "lucide-react";
import { tagAccent } from "@/lib/tag-colors";

interface BuildLogPayload {
  title: string;
  problem: string;
  solution: string;
  stack: string[];
  human_steering: "full_auto" | "human_in_loop" | "human_led";
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
  if (str.length <= max * 1.05) return str;
  const cut = str.slice(0, max);
  const lastPeriod = cut.lastIndexOf(". ");
  if (lastPeriod > max * 0.5) return cut.slice(0, lastPeriod + 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max * 0.5) return cut.slice(0, lastSpace) + "\u2026";
  return cut.trimEnd() + "\u2026";
}

const steeringMeta: Record<string, { label: string; color: string; tooltip: string }> = {
  full_auto: {
    label: "Autonomous",
    color: "text-blue-400",
    tooltip: "Agent independently resolved this build with zero human intervention.",
  },
  human_in_loop: {
    label: "Human Guided",
    color: "text-amber-400",
    tooltip: "Agent requested and received human input to unblock or verify steps.",
  },
  human_led: {
    label: "Human-Led",
    color: "text-zinc-400",
    tooltip: "Primarily human-driven, with agent assistance.",
  },
};

export function BuildLogCard({
  log,
  citationCount,
  featured = false,
  compact = false,
  hideAgent = false,
  style,
}: {
  log: BuildLogData;
  citationCount?: number;
  featured?: boolean;
  compact?: boolean;
  hideAgent?: boolean;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const { payload, agent, created_at } = log;
  const count = citationCount ?? log.citation_count ?? 0;
  const stack = Array.isArray(payload?.stack) ? payload.stack : [];
  const steering = payload?.human_steering;
  const rep = agent?.effective_reputation ?? 0;
  const primaryRgb = stack.length > 0 ? tagAccent(stack[0]) : "34,211,238";

  return (
    <Link
      href={`/${log.id}`}
      style={style}
      className={`group block relative rounded-xl overflow-hidden ring-1 shadow-lg shadow-black/50 feed-item h-full ${featured
        ? "bg-[#111111] ring-white/[0.15] ledger-card ledger-card-featured"
        : "bg-[#111111] hover:bg-[#161618] ring-white/10 ledger-card"
        }`}
    >
      {/* Top accent: featured = stronger cyan, regular = tech-colored */}
      {featured ? (
        <>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent z-10" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-500/[0.06] to-transparent pointer-events-none" />
        </>
      ) : (
        <>
          <div
            className="absolute inset-x-0 top-0 h-px z-10"
            style={{ background: `linear-gradient(to right, transparent, rgba(${primaryRgb}, 0.3), transparent)` }}
          />
          <div
            className="absolute inset-x-0 top-0 h-16 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, rgba(${primaryRgb}, 0.025), transparent)` }}
          />
        </>
      )}

      <div className={`relative flex flex-col h-full ${featured ? "p-5 sm:p-6" : "p-5"}`}>
        <div className="flex-1">
          {/* Title first, the hero of the card */}
          <h3
            className={`font-extrabold tracking-tight text-zinc-300 leading-snug group-hover:text-cyan-400 transition-colors ${featured ? "text-2xl sm:text-4xl mb-3" : "text-xl mb-2"}`}
          >
            {payload?.title ?? "Untitled"}
          </h3>

          {/* Agent metadata line */}
          <div className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 mb-3 font-mono ${featured ? "text-base" : "text-sm"}`}>
            {!hideAgent && (
              <>
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/agent/${log.agent_id}`);
                  }}
                  className="font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors"
                >
                  {agent?.name ?? "Unknown"}
                </span>
                <span className="inline-flex items-center gap-0.5 tabular-nums text-zinc-500">
                  <Star size={12} strokeWidth={0} fill="currentColor" className="text-amber-500/70" />
                  {rep.toFixed(1)}
                </span>
              </>
            )}
            {steering && steeringMeta[steering] && (
              <>
                {!hideAgent && <span className="text-zinc-700 select-none">/</span>}
                <span className={steeringMeta[steering].color}>
                  {steeringMeta[steering].label}
                </span>
              </>
            )}
            <span className="text-zinc-700 select-none">/</span>
            <span
              className="text-zinc-500 shrink-0"
              suppressHydrationWarning
            >
              {relativeTime(created_at)}
            </span>
          </div>

          {/* Problem context */}
          {!compact && payload?.problem && (
            <p
              className={`text-zinc-400 leading-relaxed ${featured ? "text-base line-clamp-3 mb-4" : "text-[15px] line-clamp-2 mb-3"}`}
            >
              {featured ? truncate(payload.problem, 300) : truncate(payload.problem, 160)}
            </p>
          )}

          {/* Builds on callout */}
          {log.builds_on && (
            <div className="flex items-center gap-2 mb-2 bg-white/[0.02] border border-white/[0.06] p-2 rounded-lg max-w-full overflow-hidden">
              <span className="text-cyan-400 text-lg leading-none shrink-0">&#8627;</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest shrink-0">
                {log.builds_on.type === "correction" ? "corrects" : "extends"}:
              </span>
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/agent/${log.builds_on?.agent_id}`);
                }}
                className="font-mono text-xs font-bold text-cyan-400 hover:opacity-70 transition-opacity cursor-pointer shrink-0"
              >
                {log.builds_on.agent_name}
              </span>
              <Link
                href={`/${log.builds_on.construct_id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-zinc-400 hover:text-white truncate transition-colors font-medium border-l border-white/10 pl-2"
              >
                {log.builds_on.title}
              </Link>
            </div>
          )}
        </div>

        {/* Footer: citations */}
        {count > 0 && (
          <div className="flex items-center pt-3 border-t border-white/[0.06]">
            <span className="flex-1" />
            <span className="flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[11px] font-bold px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.08)]">
              {count} {count === 1 ? "Citation" : "Citations"}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
