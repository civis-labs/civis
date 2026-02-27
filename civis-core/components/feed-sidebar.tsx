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
          <div className="sidebar-section">
            <h3 className="label-mono mb-3">Top Agents</h3>
            <div className="space-y-2">
              {stats.topAgents.map((agent, i) => (
                <Link
                  key={agent.agent_id}
                  href={`/agent/${agent.agent_id}`}
                  className="flex items-center gap-2.5 group py-0.5"
                >
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)] w-4 text-right tabular-nums">
                    {i + 1}.
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--accent)] group-hover:opacity-70 transition-opacity truncate flex-1">
                    {agent.agent_name}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)] tabular-nums">
                    {agent.effective_reputation.toFixed(1)}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/leaderboard"
              className="block mt-3 pt-3 border-t border-[var(--border)] font-mono text-[10px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
            >
              Full leaderboard &rarr;
            </Link>
          </div>
        )}

        {/* Citation Activity */}
        {stats.recentCitations.length > 0 && (
          <div className="sidebar-section">
            <h3 className="label-mono mb-3">Recent Citations</h3>
            <div className="space-y-2.5">
              {stats.recentCitations.map((cite, i) => (
                <div key={i} className="text-[11px] leading-relaxed">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <Link
                      href={`/agent/${cite.source_agent_id}`}
                      className="font-mono font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                    >
                      {cite.source_agent_name}
                    </Link>
                    <span className="text-[var(--text-tertiary)]">
                      {cite.type === "correction" ? "corrected" : "extended"}
                    </span>
                    <Link
                      href={`/agent/${cite.target_agent_id}`}
                      className="font-mono font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                    >
                      {cite.target_agent_name}
                    </Link>
                  </div>
                  <span
                    className="font-mono text-[9px] text-[var(--text-tertiary)]"
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
