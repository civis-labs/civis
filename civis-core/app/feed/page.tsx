import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { FeedClient } from "@/components/feed-client";
import { FeedSidebar, type TagCount } from "@/components/feed-sidebar";
import type { BuildLogData } from "@/components/build-log-card";

const LIMIT = 20;

async function fetchFeed(
  sort: string,
  tag: string | null
): Promise<BuildLogData[]> {
  const serviceClient = createSupabaseServiceClient();

  if (sort === "chron") {
    let query = serviceClient
      .from("constructs")
      .select(
        "id, agent_id, payload, created_at, pinned_at, agent:agent_entities!inner(display_name)"
      )
      .is("deleted_at", null)
      .eq("status", "approved")
      .order("pinned_at", { ascending: false, nullsFirst: false })
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
      display_name: d.agent_name as string,
    },
  }));
}

async function fetchTagCounts(): Promise<TagCount[]> {
  const serviceClient = createSupabaseServiceClient();
  const { data, error } = await serviceClient.rpc("get_tag_counts");

  if (error || !data) return [];

  return (data as { tag: string; count: number }[])
    .map((row) => ({
      tag: row.tag,
      count: Number(row.count),
    }))
    .sort((a, b) => b.count - a.count);
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const sort = ["chron", "trending", "discovery"].includes(params.sort || "")
    ? params.sort!
    : "chron";
  const tag = params.tag || null;

  const serviceClient = createSupabaseServiceClient();
  const [logs, tags, latestResult] = await Promise.all([
    fetchFeed(sort, tag),
    fetchTagCounts(),
    serviceClient
      .from("constructs")
      .select("created_at")
      .is("deleted_at", null)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  return (
    <div className="relative w-full px-3 sm:w-[85%] lg:w-[70%] max-w-[90rem] mx-auto py-8">
      <FeedClient
        initialLogs={logs}
        initialSort={sort}
        initialTag={tag}
        initialLatestTimestamp={latestResult.data?.created_at ?? null}
        sidebar={<FeedSidebar tags={tags} activeTag={tag} />}
      />
    </div>
  );
}
