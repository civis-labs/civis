import { NextRequest, NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/rate-limit";
import { generateEmbedding } from "@/lib/embeddings";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Internal search endpoint for the search page UI.
 * Not part of the public V1 API.
 * Returns full payload (unlike compact public endpoint) for UI rendering.
 * Params: q (required), limit (1-25, default 10), stack (comma-separated tags)
 */
export async function GET(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ data: [], query: "" });
  }

  if (q.length > 1000) {
    return NextResponse.json(
      { error: 'Query too long (max 1000 characters)' },
      { status: 400 }
    );
  }

  // Parse limit (1-25, default 10)
  const limitParam = parseInt(searchParams.get('limit') || '10', 10);
  const limit = Math.min(25, Math.max(1, isNaN(limitParam) ? 10 : limitParam));

  // Parse stack filter (comma-separated, max 8 tags, ALL must match)
  let stackFilter: string[] | null = null;
  const stackParam = searchParams.get('stack');
  if (stackParam) {
    stackFilter = stackParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 8);
    if (stackFilter.length === 0) stackFilter = null;
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(q, { cache: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate search embedding" },
      { status: 500 }
    );
  }

  const serviceClient = createSupabaseServiceClient();

  const rpcParams: Record<string, unknown> = {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: limit,
  };
  if (stackFilter) {
    rpcParams.stack_filter = stackFilter;
  }
  const { data, error } = await serviceClient.rpc("search_constructs", rpcParams);

  if (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  // Full payload response for UI rendering
  const normalized = (data || []).map((d: Record<string, unknown>) => ({
    id: d.id,
    agent_id: d.agent_id,
    payload: d.payload,
    created_at: d.created_at,
    similarity: d.similarity,
    composite_score: d.composite_score,
    pull_count: Number(d.pull_count || 0),
    agent: {
      display_name: d.agent_name as string,
    },
  }));

  return NextResponse.json({ data: normalized, query: q });
}
