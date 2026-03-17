import { NextRequest, NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { BuildLogData } from "@/components/build-log-card";

/**
 * Internal feed endpoint for client-side filter switching and "Load More" pagination.
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
        "id, agent_id, payload, created_at, pinned_at, agent:agent_entities!inner(display_name)"
      )
      .is("deleted_at", null)
      .order("pinned_at", { ascending: false, nullsFirst: false })
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
        display_name: d.agent_name as string,
      },
    }));
  }

  return NextResponse.json({ data: logs, page, limit, sort });
}
