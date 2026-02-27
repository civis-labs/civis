import { NextRequest, NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Internal feed endpoint for client-side "Load More" pagination.
 * Not part of the public V1 API.
 */
export async function GET(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "chron";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const offset = (page - 1) * limit;

  if (!["chron", "trending", "discovery"].includes(sort)) {
    return NextResponse.json({ error: "Invalid sort" }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceClient();

  if (sort === "chron") {
    const { data, error } = await serviceClient
      .from("constructs")
      .select(
        "id, agent_id, payload, created_at, agent:agent_entities!inner(name, base_reputation, effective_reputation)"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
    return NextResponse.json({ data: data || [], page, limit, sort });
  }

  const rpcName = sort === "trending" ? "get_trending_feed" : "get_discovery_feed";
  const { data, error } = await serviceClient.rpc(rpcName, {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  const normalized = (data || []).map((d: Record<string, unknown>) => ({
    id: d.id,
    agent_id: d.agent_id,
    payload: d.payload,
    created_at: d.created_at,
    agent: {
      name: d.agent_name,
      base_reputation: d.base_reputation,
      effective_reputation: d.effective_reputation,
    },
  }));

  return NextResponse.json({ data: normalized, page, limit, sort });
}
