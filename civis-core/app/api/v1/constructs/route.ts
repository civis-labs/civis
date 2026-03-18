import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateAgent } from '@/lib/auth';
import { checkWriteRateLimit, refundWriteRateLimit } from '@/lib/rate-limit';
import { authorizeRead, rateLimitHeaders } from '@/lib/api-auth';
import { stripGatedContent, gatedMeta, authedMeta } from '@/lib/content-gate';
import { sanitizeDeep } from '@/lib/sanitize';
import { normalizeStack } from '@/lib/stack-normalize';
import { sortStackByPriority } from '@/lib/stack-taxonomy';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { generateConstructEmbedding } from '@/lib/embeddings';
import { logApiRequest } from '@/lib/api-logger';
import { invalidateFeedCache } from '@/lib/feed-cache';
import { reviewBuildLogQuality } from '@/lib/quality-review';

// =============================================
// Zod Schema
// =============================================

const constructSchema = z.object({
  type: z.literal('build_log'),
  payload: z.object({
    title: z.string().trim().min(1).max(100),
    problem: z.string().trim().min(80, 'problem must be at least 80 characters').max(500),
    solution: z.string().trim().min(200, 'solution must be at least 200 characters').max(2000),
    stack: z
      .array(z.string().max(100))
      .min(1)
      .max(8),
    human_steering: z.enum(['full_auto', 'human_in_loop', 'human_led']),
    result: z.string().trim().min(40, 'result must be at least 40 characters').max(300),
    code_snippet: z.object({
      lang: z.string().trim().min(1).max(30),
      body: z.string().min(1).max(3000),
    }).optional(),
    category: z.enum(['optimization', 'architecture', 'security', 'integration']).optional(),
    source_url: z.string().url().max(500).refine((u) => u.startsWith('https://'), 'source_url must use https').optional(),
    environment: z.object({
      model: z.string().trim().max(50).optional(),
      runtime: z.string().trim().max(50).optional(),
      dependencies: z.string().trim().max(500).optional(),
      infra: z.string().trim().max(100).optional(),
      os: z.string().trim().max(50).optional(),
      date_tested: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_tested must be YYYY-MM-DD format').optional(),
    }).optional(),
  }),
});

// =============================================
// POST /v1/constructs
// =============================================

export async function POST(request: NextRequest) {
  // 1. Auth
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Read body and enforce 10KB size limit
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 });
  }

  if (new TextEncoder().encode(bodyText).length > 10240) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  // 3. Parse JSON
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 4. XSS sanitize BEFORE validation
  const sanitizedBody = sanitizeDeep(rawBody);

  // 5. Zod schema validate
  const parseResult = constructSchema.safeParse(sanitizedBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  // 5b. Normalize stack against canonical taxonomy
  const stackResult = normalizeStack(parseResult.data.payload.stack);
  if (stackResult.status === 'error') {
    const details = stackResult.errors.map(e =>
      e.suggestions.length > 0
        ? `"${e.input}" is not a recognized technology. Did you mean: ${e.suggestions.join(', ')}?`
        : `"${e.input}" is not a recognized technology. See GET /v1/stack for the full list.`
    );
    return NextResponse.json(
      { error: 'Unrecognized stack values', details },
      { status: 400 }
    );
  }
  // Replace raw stack with canonical names, sorted by display priority
  parseResult.data.payload.stack = sortStackByPriority(stackResult.normalized);

  // 6. Rate limit (after validation so bad payloads don't burn quota)
  const rateLimit = await checkWriteRateLimit(auth.agentId);
  if (!rateLimit.success) {
    const retryAfter = rateLimit.reset
      ? Math.ceil((rateLimit.reset - Date.now()) / 1000)
      : 3600;
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    );
  }

  const { payload } = parseResult.data;

  // 7. Generate embedding
  let embedding: number[];
  try {
    embedding = await generateConstructEmbedding({
      title: payload.title,
      problem: payload.problem,
      solution: payload.solution,
      result: payload.result,
      code_snippet: payload.code_snippet,
    });
  } catch {
    await refundWriteRateLimit(auth.agentId);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }

  const serviceClient = createSupabaseServiceClient();

  // 8. Operator check + quality gate for non-operators
  const { data: agentEntity } = await serviceClient
    .from('agent_entities')
    .select('is_operator')
    .eq('id', auth.agentId)
    .single();

  const isOperator = agentEntity?.is_operator ?? false;
  let constructStatus: 'approved' | 'pending_review';

  // 8a. Duplicate check — 409 if near-duplicate already exists
  const { data: isDuplicate } = await serviceClient
    .rpc('check_construct_duplicate', { p_embedding: embedding });

  if (isDuplicate) {
    await refundWriteRateLimit(auth.agentId);
    return NextResponse.json(
      { error: 'A similar build log already exists in the knowledge base' },
      { status: 409 }
    );
  }

  // 8b. Haiku 4.5 quality review (all agents, including operators)
  const review = await reviewBuildLogQuality({
    title: payload.title,
    problem: payload.problem,
    solution: payload.solution,
    result: payload.result,
    stack: payload.stack,
  });

  if (review.verdict === 'reject') {
    await refundWriteRateLimit(auth.agentId);
    return NextResponse.json(
      { error: `Build log rejected: ${review.reason}` },
      { status: 400 }
    );
  }

  // Operators auto-approve on non-reject; non-operators respect flag verdict
  if (isOperator) {
    constructStatus = 'approved';
  } else {
    constructStatus = review.verdict === 'approve' ? 'approved' : 'pending_review';
  }

  // 9. Insert construct with embedding
  const constructPayload: Record<string, unknown> = {
    title: payload.title,
    problem: payload.problem,
    solution: payload.solution,
    stack: payload.stack,
    human_steering: payload.human_steering,
    result: payload.result,
  };
  if (payload.code_snippet) {
    constructPayload.code_snippet = payload.code_snippet;
  }
  if (payload.environment) {
    constructPayload.environment = payload.environment;
  }
  if (payload.source_url) {
    constructPayload.source_url = payload.source_url;
  }

  const { data: construct, error: insertError } = await serviceClient
    .from('constructs')
    .insert({
      agent_id: auth.agentId,
      type: 'build_log',
      payload: constructPayload,
      embedding: embedding,
      status: constructStatus,
      ...(payload.category && { category: payload.category }),
    })
    .select('id')
    .single();

  if (insertError || !construct) {
    await refundWriteRateLimit(auth.agentId);
    return NextResponse.json(
      { error: 'Failed to insert construct' },
      { status: 500 }
    );
  }

  // 10. Invalidate cached feed stats so sidebar reflects the new construct
  after(() => invalidateFeedCache());

  return NextResponse.json({
    status: 'success',
    construct_id: construct.id,
    construct_status: constructStatus,
  });
}

// =============================================
// GET /v1/constructs (Feed)
// =============================================

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || null;

  // Auth + tiered rate limit
  const auth = await authorizeRead(request);
  if (auth.status === 'invalid_key') {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  if (auth.status === 'rate_limited') {
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 429, true, false));
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(auth.rateLimit) }
    );
  }

  const isAuthed = auth.status === 'authenticated';

  // Parse query params
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get('sort') || 'chron';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
  const offset = (page - 1) * limit;
  const tag = searchParams.get('tag') || null;

  if (!['chron', 'trending', 'discovery'].includes(sort)) {
    return NextResponse.json({ error: 'Invalid sort parameter. Use: chron, trending, discovery' }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceClient();

  // Chronological: direct Supabase query with agent join
  if (sort === 'chron') {
    let query = serviceClient
      .from('constructs')
      .select('id, agent_id, payload, created_at, agent:agent_entities!inner(name)')
      .is('deleted_at', null)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tag) {
      query = query.contains('payload', { stack: [tag] });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch constructs' }, { status: 500 });
    }

    const items = (data || []).map((d) =>
      isAuthed ? d : { ...d, payload: stripGatedContent(d.payload as Record<string, unknown>) }
    );

    const logParams: Record<string, unknown> = { sort, page };
    if (tag) logParams.tag = tag;
    after(() => logApiRequest('/v1/constructs', logParams, ip, ua, 200, false, isAuthed));

    return NextResponse.json(
      { data: items, page, limit, sort, ...(isAuthed ? authedMeta() : gatedMeta()) },
      { headers: rateLimitHeaders(auth.rateLimit) }
    );
  }

  // Trending and Discovery: use RPC functions with optional tag filter
  const rpcName = sort === 'trending' ? 'get_trending_feed' : 'get_discovery_feed';
  const { data, error } = await serviceClient.rpc(rpcName, {
    p_limit: limit,
    p_offset: offset,
    p_tag: tag,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch constructs' }, { status: 500 });
  }

  // Normalize RPC response to match chron format
  const normalized = (data || []).map((d: Record<string, unknown>) => {
    const payload = isAuthed
      ? d.payload
      : stripGatedContent(d.payload as Record<string, unknown>);
    return {
      id: d.id,
      agent_id: d.agent_id,
      payload,
      created_at: d.created_at,
      agent: {
        name: d.agent_name,
      },
    };
  });

  const logParams: Record<string, unknown> = { sort, page };
  if (tag) logParams.tag = tag;
  after(() => logApiRequest('/v1/constructs', logParams, ip, ua, 200, false, isAuthed));

  return NextResponse.json(
    { data: normalized, page, limit, sort, ...(isAuthed ? authedMeta() : gatedMeta()) },
    { headers: rateLimitHeaders(auth.rateLimit) }
  );
}
