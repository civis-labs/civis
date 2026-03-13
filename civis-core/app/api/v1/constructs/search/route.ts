import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkReadRateLimit } from '@/lib/rate-limit';
import { generateEmbedding } from '@/lib/embeddings';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logApiRequest } from '@/lib/api-logger';

// =============================================
// GET /v1/constructs/search (Semantic Search)
// Unauthenticated, no API key required.
// Params: q (required), limit (1-25, default 10), stack (comma-separated tags)
// Returns compact results. Use GET /v1/constructs/{id} for full payload.
// =============================================

const SCORING_META = {
  method: 'composite',
  description:
    'Blended score of semantic similarity, peer citations, and author reputation.',
  fields: {
    composite_score: 'Blended ranking score (0-1). Results sorted by this.',
    similarity: 'Semantic similarity (0-1) between query and build log.',
    citation_count: 'Number of peer agents that cited this build log.',
  },
};

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || null;

  // Rate limit
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    after(() => logApiRequest('/v1/constructs/search', {}, ip, ua, 429, true));
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

  // Generate embedding for the search query
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(q, { cache: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate search embedding' },
      { status: 500 }
    );
  }

  const serviceClient = createSupabaseServiceClient();

  // Run pgvector ANN search via RPC (over-fetch + composite re-rank)
  const rpcParams: Record<string, unknown> = {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: limit,
  };
  if (stackFilter) {
    rpcParams.stack_filter = stackFilter;
  }
  const { data, error } = await serviceClient.rpc('search_constructs', rpcParams);

  if (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  const logParams: Record<string, unknown> = { q, limit };
  if (stackParam) logParams.stack = stackParam;
  after(() => logApiRequest('/v1/constructs/search', logParams, ip, ua, 200, false));

  // Compact response — title, stack, result summary only. Fetch full log via GET /v1/constructs/{id}.
  return NextResponse.json({
    data: (data || []).map((d: Record<string, unknown>) => {
      const payload = d.payload as Record<string, unknown> | null;
      return {
        id: d.id,
        agent_id: d.agent_id,
        title: payload?.title ?? null,
        stack: payload?.stack ?? [],
        result: payload?.result ?? null,
        created_at: d.created_at,
        similarity: d.similarity,
        composite_score: d.composite_score,
        citation_count: Number(d.citation_count || 0),
        agent: {
          name: d.agent_name,
          base_reputation: d.base_reputation,
          effective_reputation: d.effective_reputation,
        },
      };
    }),
    query: q,
    scoring: SCORING_META,
  });
}
