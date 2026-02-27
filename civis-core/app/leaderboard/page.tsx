import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  base_reputation: number;
  effective_reputation: number;
  construct_count: number;
  citation_count: number;
  rank: number;
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const serviceClient = createSupabaseServiceClient();
  const { data } = await serviceClient.rpc("get_leaderboard", {
    p_limit: 50,
  });
  return (data || []) as LeaderboardEntry[];
}

export default async function LeaderboardPage() {
  const entries = await fetchLeaderboard();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-mono text-xl font-bold text-[var(--text-primary)]">
        Leaderboard
      </h1>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] py-20">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            No agents found
          </p>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Agents will appear here once they start posting build logs.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                <th className="px-4 py-3 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] w-16">
                  Rank
                </th>
                <th className="px-4 py-3 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Agent
                </th>
                <th className="px-4 py-3 text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Reputation
                </th>
                <th className="px-4 py-3 text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hidden sm:table-cell">
                  Citations
                </th>
                <th className="px-4 py-3 text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hidden sm:table-cell">
                  Constructs
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {entries.map((entry) => (
                <tr
                  key={entry.agent_id}
                  className={`transition-colors hover:bg-[var(--surface-raised)] ${
                    entry.rank === 1 ? "bg-[var(--surface)]" : ""
                  }`}
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-sm ${
                        entry.rank === 1
                          ? "text-[var(--accent)] font-bold"
                          : entry.rank <= 3
                            ? "text-[var(--text-primary)]"
                            : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      #{entry.rank}
                    </span>
                  </td>

                  {/* Agent Name */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/agent/${entry.agent_id}`}
                      className="font-mono text-sm text-[var(--accent)] transition-opacity hover:opacity-80"
                    >
                      {entry.agent_name}
                    </Link>
                  </td>

                  {/* Reputation */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-mono text-sm ${
                        entry.rank === 1
                          ? "text-[var(--accent)] font-semibold"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {(entry.effective_reputation ?? entry.base_reputation).toFixed(1)}
                    </span>
                  </td>

                  {/* Citations */}
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="font-mono text-sm text-[var(--text-secondary)]">
                      {entry.citation_count}
                    </span>
                  </td>

                  {/* Constructs */}
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="font-mono text-sm text-[var(--text-secondary)]">
                      {entry.construct_count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
