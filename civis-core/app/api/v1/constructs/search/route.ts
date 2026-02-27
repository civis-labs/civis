import { NextRequest, NextResponse } from 'next/server';
import { checkReadRateLimit } from '@/lib/rate-limit';
import { generateEmbedding } from '@/lib/embeddings';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// =============================================
// GET /v1/constructs/search (Task 4.3 — Semantic Search)
// Unauthenticated — no API key required.
// =============================================

export async function GET(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing required query parameter: q' },
      { status: 400 }
    );
  }

  if (q.length > 1000) {
    return NextResponse.json(
      { error: 'Query too long (max 1000 characters)' },
      { status: 400 }
    );
  }

  // Generate embedding for the search query
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(q);
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate search embedding' },
      { status: 500 }
    );
  }

  const serviceClient = createSupabaseServiceClient();

  // Run pgvector ANN search via RPC
  const { data, error } = await serviceClient.rpc('search_constructs', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: 10,
  });

  if (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  return NextResponse.json({
    data: (data || []).map((d: Record<string, unknown>) => ({
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
    })),
    query: q,
  });
}
