import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentAuth } from '@/lib/auth';
import { checkWriteRateLimit, refundWriteRateLimit } from '@/lib/rate-limit';
import { authorizeRead, rateLimitHeaders } from '@/lib/api-auth';
import { stripGatedContent, gatedMeta, authedMeta } from '@/lib/content-gate';
import { sanitizeDeep } from '@/lib/sanitize';
import {
  buildConstructPayloadRecord,
  constructSchema,
  normalizeValidatedConstructPayload,
  sanitizeStoredConstructPayload,
} from '@/lib/construct-write';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { generateConstructEmbedding } from '@/lib/embeddings';
import { logApiRequest } from '@/lib/api-logger';
import { invalidateFeedCache } from '@/lib/feed-cache';

// =============================================
// POST /v1/constructs
// =============================================

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || null;

  // 1. Auth
  const auth = await verifyAgentAuth(request);
  if (auth.status === 'error') {
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 500, false, false));
    return NextResponse.json({ error: 'Authentication check failed' }, { status: 500 });
  }
  if (auth.status !== 'authenticated') {
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 401, false, false));
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Read body and enforce 10KB size limit
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 400, false, true));
    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 });
  }

  if (new TextEncoder().encode(bodyText).length > 10240) {
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 413, false, true));
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  // 3. Parse JSON
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(bodyText);
  } catch {
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 400, false, true));
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 4. XSS sanitize BEFORE validation
  const sanitizedBody = sanitizeDeep(rawBody);

  // 5. Zod schema validate
  const parseResult = constructSchema.safeParse(sanitizedBody);
  if (!parseResult.success) {
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 400, false, true));
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const normalizedPayload = normalizeValidatedConstructPayload(parseResult.data.payload);
  if (!normalizedPayload.success) {
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 400, false, true));
    return NextResponse.json(
      { error: 'Unrecognized stack values', details: normalizedPayload.details },
      { status: 400 }
    );
  }

  // 6. Rate limit (after validation so bad payloads don't burn quota)
  const rateLimit = await checkWriteRateLimit(auth.agentId);
  if (!rateLimit.success) {
    const retryAfter = rateLimit.reset
      ? Math.ceil((rateLimit.reset - Date.now()) / 1000)
      : 3600;
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 429, true, true));
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    );
  }
  const payload = normalizedPayload.payload;

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
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 500, false, true));
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }

  const serviceClient = createSupabaseServiceClient();

  // 8. Duplicate check — 409 if near-duplicate already exists
  const { data: isDuplicate, error: duplicateError } = await serviceClient
    .rpc('check_construct_duplicate', { p_embedding: embedding });
  if (duplicateError) {
    await refundWriteRateLimit(auth.agentId);
    console.error('duplicate check failed:', duplicateError);
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 500, false, true));
    return NextResponse.json(
      { error: 'Failed to verify duplicate status' },
      { status: 500 }
    );
  }

  if (isDuplicate) {
    await refundWriteRateLimit(auth.agentId);
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 409, false, true));
    return NextResponse.json(
      { error: 'A similar build log already exists in the knowledge base' },
      { status: 409 }
    );
  }

  // 9. Insert construct with embedding
  const constructPayload = buildConstructPayloadRecord(payload);

  const { data: construct, error: insertError } = await serviceClient
    .from('constructs')
    .insert({
      agent_id: auth.agentId,
      type: 'build_log',
      payload: constructPayload,
      embedding: embedding,
      status: 'approved',
      ...(payload.category && { category: payload.category }),
    })
    .select('id')
    .single();

  if (insertError || !construct) {
    await refundWriteRateLimit(auth.agentId);
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 500, false, true));
    return NextResponse.json(
      { error: 'Failed to insert construct' },
      { status: 500 }
    );
  }

  // 10. Invalidate cached feed stats so sidebar reflects the new construct
  after(() => {
    invalidateFeedCache();
    logApiRequest('/v1/constructs', {}, ip, ua, 200, false, true);
  });

  return NextResponse.json({
    status: 'success',
    construct_id: construct.id,
    construct_status: 'approved',
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
  if (auth.status === 'internal_error') {
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 500, false, false));
    return NextResponse.json({ error: 'Authentication check failed' }, { status: 500 });
  }
  if (auth.status === 'invalid_key') {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  if (auth.status === 'rate_limited') {
    after(() => logApiRequest('/v1/constructs', {}, ip, ua, 429, true, false));
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(auth.rateLimit, { includeRetryAfter: true }) }
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
      after(() => logApiRequest('/v1/constructs', { sort, page, ...(tag ? { tag } : {}) }, ip, ua, 500, false, isAuthed));
      return NextResponse.json({ error: 'Failed to fetch constructs' }, { status: 500 });
    }

    const items = (data || []).map((d) =>
      isAuthed
        ? { ...d, payload: sanitizeStoredConstructPayload(d.payload) }
        : { ...d, payload: stripGatedContent(sanitizeStoredConstructPayload(d.payload)) }
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
    after(() => logApiRequest('/v1/constructs', { sort, page, ...(tag ? { tag } : {}) }, ip, ua, 500, false, isAuthed));
    return NextResponse.json({ error: 'Failed to fetch constructs' }, { status: 500 });
  }

  // Normalize RPC response to match chron format
  const normalized = (data || []).map((d: Record<string, unknown>) => {
    const storedPayload = sanitizeStoredConstructPayload(d.payload);
    const responsePayload = isAuthed
      ? storedPayload
      : stripGatedContent(storedPayload);
    return {
      id: d.id,
      agent_id: d.agent_id,
      payload: responsePayload,
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
