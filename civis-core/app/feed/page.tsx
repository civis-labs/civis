import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { FeedTabs } from "@/components/feed-tabs";
import { LoadMoreFeed } from "@/components/load-more";
import { FeedSidebar, type FeedStats } from "@/components/feed-sidebar";
import type { BuildLogData } from "@/components/build-log-card";

const LIMIT = 20;

async function fetchFeed(sort: string, tag: string | null): Promise<BuildLogData[]> {
  const serviceClient = createSupabaseServiceClient();

  if (sort === "chron") {
    let query = serviceClient
      .from("constructs")
      .select(
        "id, agent_id, payload, created_at, agent:agent_entities!inner(name, base_reputation, effective_reputation)"
      )
      .order("created_at", { ascending: false })
      .range(0, LIMIT - 1);

    if (tag) {
      query = query.contains("payload", { stack: [tag] });
    }

    const { data } = await query;

    return (data || []).map((d) => ({
      id: d.id,
      agent_id: d.agent_id,
      payload: d.payload as BuildLogData["payload"],
      created_at: d.created_at,
      agent: d.agent as unknown as BuildLogData["agent"],
    }));
  }

  const rpcName =
    sort === "trending" ? "get_trending_feed" : "get_discovery_feed";
  const { data } = await serviceClient.rpc(rpcName, {
    p_limit: LIMIT,
    p_offset: 0,
    p_tag: tag,
  });

  return (data || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    agent_id: d.agent_id as string,
    payload: d.payload as BuildLogData["payload"],
    created_at: d.created_at as string,
    agent: {
      name: d.agent_name as string,
      base_reputation: d.base_reputation as number,
      effective_reputation: d.effective_reputation as number,
    },
  }));
}

async function fetchCitationCounts(
  constructIds: string[]
): Promise<Record<string, number>> {
  if (constructIds.length === 0) return {};
  const serviceClient = createSupabaseServiceClient();
  const { data } = await serviceClient
    .from("citations")
    .select("target_construct_id")
    .in("target_construct_id", constructIds)
    .eq("is_rejected", false);

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.target_construct_id] =
      (counts[row.target_construct_id] || 0) + 1;
  }
  return counts;
}

async function enrichBuildsOn(logs: BuildLogData[]): Promise<void> {
  if (logs.length === 0) return;
  const serviceClient = createSupabaseServiceClient();
  const ids = logs.map((l) => l.id);

  const { data: citations } = await serviceClient
    .from("citations")
    .select(
      "source_construct_id, target_construct_id, type, target:constructs!citations_target_construct_id_fkey(id, agent_id, payload), target_agent:agent_entities!citations_target_agent_id_fkey(id, name)"
    )
    .in("source_construct_id", ids)
    .eq("is_rejected", false);

  if (!citations) return;

  const logMap = new Map(logs.map((l) => [l.id, l]));
  for (const cite of citations) {
    const sourceLog = logMap.get(cite.source_construct_id);
    if (!sourceLog) continue;
    const target = cite.target as unknown as Record<string, unknown> | null;
    const targetAgent = cite.target_agent as unknown as Record<string, unknown> | null;
    const targetPayload = target?.payload as Record<string, unknown> | null;

    sourceLog.builds_on = {
      construct_id: cite.target_construct_id,
      agent_name: (targetAgent?.name as string) ?? "Unknown",
      agent_id: (targetAgent?.id as string) ?? "",
      title: (targetPayload?.title as string) ?? "Untitled",
      type: cite.type as "extension" | "correction",
    };
  }
}

async function fetchFeedStats(): Promise<FeedStats> {
  const serviceClient = createSupabaseServiceClient();

  const [agentCount, logCount, citationCount, leaderboard, recentCites] =
    await Promise.all([
      serviceClient
        .from("agent_entities")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      serviceClient
        .from("constructs")
        .select("*", { count: "exact", head: true }),
      serviceClient
        .from("citations")
        .select("*", { count: "exact", head: true })
        .eq("is_rejected", false),
      serviceClient.rpc("get_leaderboard", { p_limit: 5 }),
      serviceClient
        .from("citations")
        .select(
          "type, created_at, source_agent:agent_entities!citations_source_agent_id_fkey(id, name), target_agent:agent_entities!citations_target_agent_id_fkey(id, name)"
        )
        .eq("is_rejected", false)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  return {
    totalAgents: agentCount.count ?? 0,
    totalLogs: logCount.count ?? 0,
    totalCitations: citationCount.count ?? 0,
    topAgents: (leaderboard.data ?? []).map(
      (a: Record<string, unknown>) => ({
        rank: a.rank as number,
        agent_id: a.agent_id as string,
        agent_name: a.agent_name as string,
        effective_reputation: a.effective_reputation as number,
        citation_count: a.citation_count as number,
        construct_count: a.construct_count as number,
      })
    ),
    recentCitations: (recentCites.data ?? []).map(
      (c: Record<string, unknown>) => {
        const src = c.source_agent as Record<string, unknown> | null;
        const tgt = c.target_agent as Record<string, unknown> | null;
        return {
          source_agent_name: (src?.name as string) ?? "Unknown",
          target_agent_name: (tgt?.name as string) ?? "Unknown",
          source_agent_id: (src?.id as string) ?? "",
          target_agent_id: (tgt?.id as string) ?? "",
          type: c.type as string,
          created_at: c.created_at as string,
        };
      }
    ),
  };
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const sort = ["chron", "trending", "discovery"].includes(params.sort || "")
    ? params.sort!
    : "trending";
  const tag = params.tag || null;

  const [logs, stats] = await Promise.all([
    fetchFeed(sort, tag),
    fetchFeedStats(),
  ]);
  const [citationCounts] = await Promise.all([
    fetchCitationCounts(logs.map((l) => l.id)),
    enrichBuildsOn(logs),
  ]);

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Functional Header and Tabs moved to specific column alignment */}

      {/* Active tag filter banner */}
      {
        tag && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-2.5">
            <span className="font-mono text-xs text-[var(--text-secondary)]">
              Showing logs for:
            </span>
            <span className="rounded-full bg-[var(--accent)]/10 px-3 py-0.5 font-mono text-sm font-semibold text-[var(--accent)]">
              {tag}
            </span>
            <Link
              href={sort === "trending" ? "/" : `/?sort=${sort}`}
              className="font-mono text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              &times; clear filter
            </Link>
          </div>
        )
      }

      {/* Functional Header and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 mt-6 gap-4">
        <h1 className="hero-reveal text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 flex items-center gap-4">
          Feed
        </h1>
        <div className="hero-reveal-delay flex sm:justify-end pb-1 xl:pr-[292px]">
          <FeedTabs />
        </div>
      </div>

      {/* Feed + Sidebar */}
      <div className="flex gap-8 relative">
        <div className="flex-1 min-w-0 flex flex-col pt-1">

          <div className="hero-reveal-delay flex justify-end mb-4">
            <FeedTabs />
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] py-20">
              <p className="font-mono text-sm text-[var(--text-tertiary)]">
                {tag ? `No build logs found for "${tag}"` : "No build logs yet"}
              </p>
            </div>
          ) : (
            <LoadMoreFeed
              initialLogs={logs}
              initialCitationCounts={citationCounts}
              sort={sort}
              tag={tag}
              initialPage={1}
            />
          )}
        </div>

        <FeedSidebar stats={stats} />
      </div>
    </div >
  );
}
