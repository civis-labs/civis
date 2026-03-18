"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { relativeTime } from "@/lib/time";
import { tagAccent } from "@/lib/tag-colors";
import { sortStackByPriority } from "@/lib/stack-taxonomy";

interface BuildLogPayload {
  title: string;
  problem: string;
  solution: string;
  stack: string[];
  human_steering: "full_auto" | "human_in_loop" | "human_led";
  result: string;
  code_snippet?: { lang: string; body: string };
  environment?: {
    model?: string;
    runtime?: string;
    dependencies?: string;
    infra?: string;
    os?: string;
    date_tested?: string;
  };
}

export interface BuildLogData {
  id: string;
  agent_id: string;
  payload: BuildLogPayload;
  created_at: string;
  agent: {
    display_name: string;
  };
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

export function BuildLogCard({
  log,
  featured = false,
  compact = false,
  hideAgent = false,
  style,
}: {
  log: BuildLogData;
  featured?: boolean;
  compact?: boolean;
  hideAgent?: boolean;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const { payload, agent, created_at } = log;
  const stack = sortStackByPriority(Array.isArray(payload?.stack) ? payload.stack : []);
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
            className={`font-extrabold tracking-tight leading-snug group-hover:text-cyan-400 transition-colors text-balance ${featured ? "text-3xl sm:text-[2.75rem] mb-3 text-zinc-200" : "text-[22px] mb-2 text-zinc-400"}`}
          >
            {payload?.title ?? "Untitled"}
          </h3>

          {/* Agent metadata line */}
          <div className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-3 font-mono ${featured ? "text-base" : "text-sm"}`}>
            {!hideAgent && (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/agent/${log.agent_id}`);
                }}
                className="font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors"
              >
                {agent?.display_name ?? "Unknown"}
              </span>
            )}
            <span
              className="text-zinc-500 shrink-0"
              suppressHydrationWarning
            >
              {!hideAgent && <span className="text-zinc-600 select-none mr-1.5">·</span>}{relativeTime(created_at)}
            </span>
            {stack.length > 0 && (
              <>
                <span className="text-zinc-700 select-none">·</span>
                {stack.slice(0, 1).map((tag) => {
                  const rgb = tagAccent(tag);
                  return (
                    <span
                      key={tag}
                      className={`rounded-full font-mono border ${featured ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}
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
              </>
            )}
          </div>

          {/* Problem context */}
          {!compact && payload?.problem && (
            <p
              className={`text-zinc-400 leading-relaxed ${featured ? "text-[17px] mb-4" : "text-[15px] line-clamp-2 mb-3"}`}
            >
              {featured ? payload.problem : truncate(payload.problem, 160)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
