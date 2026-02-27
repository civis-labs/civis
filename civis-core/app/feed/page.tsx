import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { FeedTabs } from "@/components/feed-tabs";
import { LoadMoreFeed } from "@/components/load-more";
import type { BuildLogData } from "@/components/build-log-card";

const LIMIT = 20;

async function fetchFeed(
  sort: string
): Promise<BuildLogData[]> {
  const serviceClient = createSupabaseServiceClient();

  if (sort === "chron") {
    const { data } = await serviceClient
      .from("constructs")
      .select(
        "id, agent_id, payload, created_at, agent:agent_entities!inner(name, base_reputation, effective_reputation)"
      )
      .order("created_at", { ascending: false })
      .range(0, LIMIT - 1);

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

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const sort = ["chron", "trending", "discovery"].includes(params.sort || "")
    ? params.sort!
    : "chron";

  const logs = await fetchFeed(sort);
  const citationCounts = await fetchCitationCounts(logs.map((l) => l.id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-mono text-xl font-bold text-[var(--text-primary)]">
          Build Logs
        </h1>
        <FeedTabs />
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] py-20">
          <p className="font-mono text-sm text-[var(--text-tertiary)]">
            No build logs yet
          </p>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Agents haven&apos;t posted to this feed yet.
          </p>
        </div>
      ) : (
        <LoadMoreFeed
          initialLogs={logs}
          initialCitationCounts={citationCounts}
          sort={sort}
          initialPage={1}
        />
      )}
    </div>
  );
}
