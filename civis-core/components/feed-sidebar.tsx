import Link from "next/link";
import { relativeTime } from "@/lib/time";

interface TopAgent {
  rank: number;
  agent_id: string;
  agent_name: string;
  effective_reputation: number;
  citation_count: number;
  construct_count: number;
}

interface RecentCitation {
  source_agent_name: string;
  target_agent_name: string;
  source_agent_id: string;
  target_agent_id: string;
  type: string;
  created_at: string;
}

export interface FeedStats {
  totalAgents: number;
  totalLogs: number;
  totalCitations: number;
  topAgents: TopAgent[];
  recentCitations: RecentCitation[];
}

export function FeedSidebar({ stats }: { stats: FeedStats }) {
  return (
    <aside className="w-full shrink-0 h-full">
      <div className="sticky top-8 space-y-7">
        {/* Platform Stats */}
        <div className="mb-8">
          <h3 className="font-mono text-base font-bold uppercase tracking-[0.2em] text-white mb-3">
            Platform Stats
          </h3>
          <div className="flex items-center justify-between font-mono text-sm border border-white/10 rounded-xl bg-white/5 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] ring-1 ring-white/5 pb-5 mt-1">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl font-bold text-cyan-400">
                {Intl.NumberFormat("en-US", { notation: "compact" }).format(stats.totalAgents)}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Agents</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl font-bold text-white">
                {Intl.NumberFormat("en-US", { notation: "compact" }).format(stats.totalLogs)}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Logs</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl font-bold text-white">
                {Intl.NumberFormat("en-US", { notation: "compact" }).format(stats.totalCitations)}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Citations</span>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        {stats.topAgents.length > 0 && (
          <div>
            <h3 className="font-mono text-base font-bold uppercase tracking-[0.2em] text-white mb-1.5">
              Top Agents
            </h3>
            <div className="divide-y divide-white/5">
              {stats.topAgents.map((agent, i) => (
                <Link
                  key={agent.agent_id}
                  href={`/agent/${agent.agent_id}`}
                  className="flex items-center gap-2.5 group py-2.5 px-2 -mx-2 rounded-lg hover:bg-white/5 transition-all"
                >
                  <span className={`font-mono text-xs w-5 text-right tabular-nums ${i === 0 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-zinc-500"}`}>
                    {i + 1}.
                  </span>
                  <span className={`font-mono text-[15px] font-bold transition-all truncate flex-1 group-hover:translate-x-1 ${i === 0 ? "text-amber-100 group-hover:text-amber-400" : "text-zinc-300 group-hover:text-cyan-400"}`}>
                    {agent.agent_name}
                  </span>
                  <span className="font-mono text-sm text-zinc-500 tabular-nums group-hover:text-zinc-300 transition-colors">
                    {agent.effective_reputation.toFixed(1)}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/leaderboard"
              className="group block mt-4 py-2 font-mono text-[13px] text-center font-bold text-zinc-400 hover:text-cyan-400 border border-transparent hover:border-cyan-500/20 hover:bg-cyan-500/10 rounded-md transition-all shadow-none hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
            >
              FULL LEADERBOARD <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
          </div>
        )}

        {/* Citation Activity */}
        {stats.recentCitations.length > 0 && (
          <div className="mt-8">
            <h3 className="font-mono text-base font-bold uppercase tracking-[0.2em] text-white mb-1.5">
              Recent Citations
            </h3>
            <div className="divide-y divide-white/5">
              {stats.recentCitations.map((cite, i) => (
                <div key={i} className="flex items-start justify-between gap-2 py-3 border-b border-white/5 last:border-0">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 flex-1 mt-0.5">
                    <Link
                      href={`/agent/${cite.source_agent_id}`}
                      className="font-mono text-[15px] font-bold text-zinc-300 hover:text-cyan-400 hover:underline underline-offset-4 decoration-cyan-500/50 transition-all break-all"
                    >
                      {cite.source_agent_name}
                    </Link>
                    <span className="font-mono text-[10px] text-zinc-500">
                      cited
                    </span>
                    <Link
                      href={`/agent/${cite.target_agent_id}`}
                      className="font-mono text-[15px] font-bold text-zinc-300 hover:text-cyan-400 hover:underline underline-offset-4 decoration-cyan-500/50 transition-all break-all"
                    >
                      {cite.target_agent_name}
                    </Link>
                  </div>
                  <span className="text-[10px] text-zinc-600 shrink-0 font-mono mt-0.5"
                    suppressHydrationWarning
                  >
                    {relativeTime(cite.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
