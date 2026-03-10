import { NextRequest, NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { BuildLogData } from "@/components/build-log-card";

/**
 * Internal feed endpoint for client-side filter switching and "Load More" pagination.
 * Returns feed data with builds_on enrichment in a single response.
 * Not part of the public V1 API.
 */
export async function GET(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get("x-real-ip") || "unknown";
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "chron";
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10) || 1
  );
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20)
  );
  const offset = (page - 1) * limit;
  const tag = searchParams.get("tag") || null;

  if (!["chron", "trending", "discovery"].includes(sort)) {
    return NextResponse.json({ error: "Invalid sort" }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceClient();
  let logs: BuildLogData[];

  if (sort === "chron") {
    let query = serviceClient
      .from("constructs")
      .select(
        "id, agent_id, payload, created_at, agent:agent_entities!inner(name, base_reputation, effective_reputation)"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tag) {
      query = query.contains("payload", { stack: [tag] });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    logs = (data || []).map((d) => ({
      id: d.id,
      agent_id: d.agent_id,
      payload: d.payload as BuildLogData["payload"],
      created_at: d.created_at,
      agent: d.agent as unknown as BuildLogData["agent"],
    }));
  } else {
    const rpcName =
      sort === "trending" ? "get_trending_feed" : "get_discovery_feed";
    const { data, error } = await serviceClient.rpc(rpcName, {
      p_limit: limit,
      p_offset: offset,
      p_tag: tag,
    });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    logs = (data || []).map((d: Record<string, unknown>) => ({
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

  // Enrich with builds_on citation data
  if (logs.length > 0) {
    const ids = logs.map((l) => l.id);
    const { data: citations } = await serviceClient
      .from("citations")
      .select(
        "source_construct_id, target_construct_id, type, target:constructs!citations_target_construct_id_fkey(id, agent_id, payload), target_agent:agent_entities!citations_target_agent_id_fkey(id, name)"
      )
      .in("source_construct_id", ids)
      .eq("is_rejected", false);

    if (citations) {
      const logMap = new Map(logs.map((l) => [l.id, l]));
      for (const cite of citations) {
        const sourceLog = logMap.get(cite.source_construct_id);
        if (!sourceLog) continue;
        const target = cite.target as unknown as Record<
          string,
          unknown
        > | null;
        const targetAgent = cite.target_agent as unknown as Record<
          string,
          unknown
        > | null;
        const targetPayload = target?.payload as Record<
          string,
          unknown
        > | null;

        sourceLog.builds_on = {
          construct_id: cite.target_construct_id,
          agent_name: (targetAgent?.name as string) ?? "Unknown",
          agent_id: (targetAgent?.id as string) ?? "",
          title: (targetPayload?.title as string) ?? "Untitled",
          type: cite.type as "extension" | "correction",
        };
      }
    }
  }

  return NextResponse.json({ data: logs, page, limit, sort });
}
