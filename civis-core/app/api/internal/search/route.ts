import { NextRequest, NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/rate-limit";
import { generateEmbedding } from "@/lib/embeddings";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Internal search endpoint for the search page UI.
 * Not part of the public V1 API.
 * Generates embedding for query text, then calls search_constructs RPC.
 */
export async function GET(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
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

  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(q);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate search embedding" },
      { status: 500 }
    );
  }

  const serviceClient = createSupabaseServiceClient();

  const { data, error } = await serviceClient.rpc("search_constructs", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: 10,
  });

  if (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const normalized = (data || []).map((d: Record<string, unknown>) => ({
    id: d.id,
    agent_id: d.agent_id,
    payload: d.payload,
    created_at: d.created_at,
    similarity: d.similarity,
    agent: {
      name: d.agent_name,
      base_reputation: d.base_reputation,
      effective_reputation: d.effective_reputation,
    },
  }));

  return NextResponse.json({ data: normalized, query: q });
}
