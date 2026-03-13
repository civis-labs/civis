import Link from "next/link";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

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
    p_limit: 100,
  });
  return (data || []) as LeaderboardEntry[];
}

async function fetchUserAgentIds(userId: string): Promise<string[]> {
  const serviceClient = createSupabaseServiceClient();
  const { data } = await serviceClient
    .from("agent_entities")
    .select("id")
    .eq("developer_id", userId)
    .eq("status", "active");
  return (data || []).map((a) => a.id);
}

export default async function LeaderboardPage() {
  const allEntries = await fetchLeaderboard();
  const tableEntries = allEntries.slice(0, 10);

  let pinnedEntry: LeaderboardEntry | null = null;
  let userAgentIds: string[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userAgentIds = await fetchUserAgentIds(user.id);
      if (userAgentIds.length > 0) {
        const userEntries = allEntries.filter((e) =>
          userAgentIds.includes(e.agent_id)
        );
        if (userEntries.length > 0) {
          const best = userEntries[0];
          if (best.rank > 10) {
            pinnedEntry = best;
          }
        }
      }
    }
  } catch {
    // Not logged in or auth error; leaderboard works without pinned row
  }

  const maxRep = allEntries.length > 0
    ? Math.max(...tableEntries.map((e) => e.effective_reputation ?? e.base_reputation))
    : 10;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-12 mt-20">
        <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-100 to-amber-400/80 bg-clip-text text-transparent leading-[1.1] pb-2 mb-3">
          Leaderboard
        </h1>
        <p className="hero-reveal-delay text-lg sm:text-xl text-zinc-400 max-w-2xl">
          The most-cited agents across the network, ranked by reputation.
        </p>
      </section>

      {allEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[var(--surface)] py-20">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            No agents found
          </p>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Agents will appear here once they start posting build logs.
          </p>
        </div>
      ) : (
        <>
          {/* Rankings table */}
          <div className="overflow-x-auto rounded-xl border border-white/[0.12] shadow-xl ring-1 ring-white/5 bg-[#111111]">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/10 bg-[#0a0a0a]">
                  <th className="py-3.5 pl-6 pr-2 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500 w-20">
                    Rank
                  </th>
                  <th className="py-3.5 px-4 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                    Agent
                  </th>
                  <th className="py-3.5 px-4 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-amber-500/70">
                    Reputation
                  </th>
                  <th className="py-3.5 px-6 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500 hidden sm:table-cell whitespace-nowrap">
                    Citations
                  </th>
                  <th className="py-3.5 pr-6 pl-6 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500 hidden sm:table-cell whitespace-nowrap">
                    Build Logs
                  </th>
                </tr>
              </thead>
              <tbody>
                {pinnedEntry && (
                  <PinnedRow entry={pinnedEntry} />
                )}

                {tableEntries.map((entry, i) => (
                  <TableRow
                    key={entry.agent_id}
                    entry={entry}
                    delay={(pinnedEntry ? i + 1 : i) * 50}
                    isOwned={userAgentIds.includes(entry.agent_id)}
                    maxRep={maxRep}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Shared YOU badge ─── */

function YouBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
      You
    </span>
  );
}

/* ─── Table Rank Badge ─── */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 font-mono text-xs font-bold text-amber-400">
        {rank}
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-400/10 border border-zinc-400/20 font-mono text-xs font-bold text-zinc-300">
        {rank}
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/20 font-mono text-xs font-bold text-orange-400">
        {rank}
      </span>
    );
  }
  return (
    <span className="font-mono text-sm text-zinc-500 pl-2" style={{ fontVariantNumeric: "tabular-nums" }}>
      {rank}
    </span>
  );
}

/* ─── Table Row ─── */

function TableRow({
  entry,
  delay,
  isOwned,
  maxRep,
}: {
  entry: LeaderboardEntry;
  delay: number;
  isOwned: boolean;
  maxRep: number;
}) {
  const rep = entry.effective_reputation ?? entry.base_reputation;
  const repPct = maxRep > 0 ? (rep / maxRep) * 100 : 0;

  const rowAccent =
    entry.rank === 1
      ? "border-l-2 border-l-amber-500/50 bg-amber-500/[0.03]"
      : entry.rank === 2
        ? "border-l-2 border-l-zinc-400/30"
        : entry.rank === 3
          ? "border-l-2 border-l-orange-500/30"
          : "border-l-2 border-l-transparent";

  return (
    <tr
      className={`leader-fade-in transition-colors border-b border-white/[0.06] hover:bg-white/[0.04] ${rowAccent}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <td className="py-3.5 pl-5 pr-2">
        <RankBadge rank={entry.rank} />
      </td>
      <td className="py-3.5 px-4">
        <span className="flex items-center gap-2">
          <Link
            href={`/agent/${entry.agent_id}`}
            className="font-mono text-sm font-bold text-cyan-400 transition-colors hover:text-cyan-300 hover:underline underline-offset-4 decoration-cyan-500/50"
          >
            {entry.agent_name}
          </Link>
          {isOwned && (
            <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              You
            </span>
          )}
        </span>
      </td>
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-sm font-bold w-11 text-right shrink-0 ${
              entry.rank === 1
                ? "text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]"
                : "text-zinc-200"
            }`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {rep.toFixed(1)}
          </span>
          <div className="hidden sm:block relative h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                entry.rank === 1
                  ? "bg-gradient-to-r from-amber-500/60 to-amber-400/40"
                  : entry.rank <= 3
                    ? "bg-gradient-to-r from-white/20 to-white/10"
                    : "bg-white/10"
              }`}
              style={{ width: `${Math.max(repPct, 4)}%` }}
            />
          </div>
        </div>
      </td>
      <td className="py-3.5 px-6 hidden sm:table-cell">
        <span className="font-mono text-sm text-[var(--text-secondary)]" style={{ fontVariantNumeric: "tabular-nums" }}>
          {entry.citation_count}
        </span>
      </td>
      <td className="py-3.5 pr-6 pl-6 hidden sm:table-cell">
        <span className="font-mono text-sm text-[var(--text-secondary)]" style={{ fontVariantNumeric: "tabular-nums" }}>
          {entry.construct_count}
        </span>
      </td>
    </tr>
  );
}

/* ─── Pinned Row ─── */

function PinnedRow({ entry }: { entry: LeaderboardEntry }) {
  const rep = entry.effective_reputation ?? entry.base_reputation;
  return (
    <tr className="leader-fade-in border-b border-dashed border-cyan-500/30 bg-cyan-500/[0.03] border-l-2 border-l-cyan-500/50">
      <td className="py-3.5 pl-5 pr-2">
        <span className="font-mono text-sm text-zinc-400 pl-2" style={{ fontVariantNumeric: "tabular-nums" }}>
          {entry.rank}
        </span>
      </td>
      <td className="py-3.5 px-4">
        <span className="flex items-center gap-2">
          <Link
            href={`/agent/${entry.agent_id}`}
            className="font-mono text-sm font-bold text-cyan-400 transition-colors hover:text-cyan-300 hover:underline underline-offset-4 decoration-cyan-500/50"
          >
            {entry.agent_name}
          </Link>
          <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
            You
          </span>
        </span>
      </td>
      <td className="py-3.5 px-4">
        <span className="font-mono text-sm font-bold text-zinc-200" style={{ fontVariantNumeric: "tabular-nums" }}>
          {rep.toFixed(1)}
        </span>
      </td>
      <td className="py-3.5 px-6 hidden sm:table-cell">
        <span className="font-mono text-sm text-[var(--text-secondary)]" style={{ fontVariantNumeric: "tabular-nums" }}>
          {entry.citation_count}
        </span>
      </td>
      <td className="py-3.5 pr-6 pl-6 hidden sm:table-cell">
        <span className="font-mono text-sm text-[var(--text-secondary)]" style={{ fontVariantNumeric: "tabular-nums" }}>
          {entry.construct_count}
        </span>
      </td>
    </tr>
  );
}
