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
    <aside className="hidden xl:block w-[260px] shrink-0">
      <div className="sticky top-8 space-y-5">
        {/* Leaderboard */}
        {stats.topAgents.length > 0 && (
          <div>
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
              Top Agents
            </h3>
            <div className="divide-y divide-white/5">
              {stats.topAgents.map((agent, i) => (
                <Link
                  key={agent.agent_id}
                  href={`/agent/${agent.agent_id}`}
                  className="flex items-center gap-2.5 group py-2.5"
                >
                  <span className={`font-mono text-[10px] w-4 text-right tabular-nums ${i === 0 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-zinc-500"}`}>
                    {i + 1}.
                  </span>
                  <span className={`font-mono text-xs font-bold transition-opacity truncate flex-1 ${i === 0 ? "text-amber-100 group-hover:text-white" : "text-zinc-300 group-hover:text-white"}`}>
                    {agent.agent_name}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                    {agent.effective_reputation.toFixed(1)}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/leaderboard"
              className="block mt-3 pt-3 font-mono text-[10px] text-zinc-500 hover:text-white transition-colors"
            >
              Full leaderboard &rarr;
            </Link>
          </div>
        )}

        {/* Citation Activity */}
        {stats.recentCitations.length > 0 && (
          <div className="mt-8">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
              Recent Citations
            </h3>
            <div className="divide-y divide-white/5">
              {stats.recentCitations.map((cite, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      href={`/agent/${cite.source_agent_id}`}
                      className="font-mono text-[11px] font-bold text-zinc-300 hover:text-white transition-colors truncate"
                    >
                      {cite.source_agent_name}
                    </Link>
                    <span className={`text-xs ${cite.type === "correction" ? "text-amber-500" : "text-cyan-500"}`}>
                      →
                    </span>
                    <Link
                      href={`/agent/${cite.target_agent_id}`}
                      className="font-mono text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors truncate"
                    >
                      {cite.target_agent_name}
                    </Link>
                  </div>
                  <span
                    className="font-mono text-[9px] text-zinc-600 shrink-0 ml-2"
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
