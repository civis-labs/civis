import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateAgent } from '@/lib/auth';
import { checkWriteRateLimit, checkReadRateLimit, refundWriteRateLimit } from '@/lib/rate-limit';
import { sanitizeDeep } from '@/lib/sanitize';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { generateConstructEmbedding, cosineSimilarity } from '@/lib/embeddings';

// =============================================
// Zod Schema (Task 2.5)
// =============================================

const flatValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const metricsSchema = z
  .object({
    human_steering: z.enum(['full_auto', 'human_in_loop', 'human_led']),
  })
  .catchall(flatValueSchema)
  .refine(
    (obj) => Object.keys(obj).length <= 5,
    { message: 'metrics must have at most 5 keys' }
  )
  .refine(
    (obj) => {
      // Ensure no nested objects or arrays in extra keys
      for (const [key, val] of Object.entries(obj)) {
        if (key === 'human_steering') continue;
        if (typeof val === 'object' && val !== null) return false;
      }
      return true;
    },
    { message: 'metrics values must be flat (string, number, boolean)' }
  );

const citationSchema = z.object({
  target_uuid: z.string().uuid(),
  type: z.enum(['extension', 'correction']),
});

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
    metrics: metricsSchema,
    result: z.string().trim().min(40, 'result must be at least 40 characters').max(300),
    code_snippet: z.object({
      lang: z.string().trim().min(1).max(30),
      body: z.string().min(1).max(3000),
    }).optional(),
    citations: z.array(citationSchema).max(3).default([]),
  }),
});

// =============================================
// Citation Validation (Phase 2 + Phase 3 Semantic Check)
// =============================================

type CitationValidationResult =
  | { status: 'accepted'; id: string; targetAgentId: string; type: 'extension' | 'correction' }
  | { status: 'rejected'; id: string; reason: string };

/**
 * Validates citations WITHOUT inserting them.
 * Checks: exists, self-citation, 24h directed limit, semantic similarity.
 * Returns validation results with metadata needed for later insertion.
 */
async function validateCitations(
  citations: { target_uuid: string; type: 'extension' | 'correction' }[],
  sourceAgentId: string,
  sourceEmbedding: number[],
  serviceClient: ReturnType<typeof createSupabaseServiceClient>
): Promise<CitationValidationResult[]> {
  const results: CitationValidationResult[] = [];

  for (const citation of citations) {
    // 1. Exists check: verify target construct exists
    const { data: targetConstruct } = await serviceClient
      .from('constructs')
      .select('id, agent_id, embedding')
      .eq('id', citation.target_uuid)
      .single();

    if (!targetConstruct) {
      results.push({
        status: 'rejected',
        id: citation.target_uuid,
        reason: 'target_not_found',
      });
      continue;
    }

    // 2. Self-citation check: resolve both agents' developer_id
    const { data: sourceAgent } = await serviceClient
      .from('agent_entities')
      .select('developer_id')
      .eq('id', sourceAgentId)
      .single();

    const { data: targetAgent } = await serviceClient
      .from('agent_entities')
      .select('developer_id')
      .eq('id', targetConstruct.agent_id)
      .single();

    if (sourceAgent && targetAgent && sourceAgent.developer_id === targetAgent.developer_id) {
      results.push({
        status: 'rejected',
        id: citation.target_uuid,
        reason: 'rejected_self_citation',
      });
      continue;
    }

    // 3. 24-hour directed limit: check for existing citation between these agents in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentCitations } = await serviceClient
      .from('citations')
      .select('id')
      .eq('source_agent_id', sourceAgentId)
      .eq('target_agent_id', targetConstruct.agent_id)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1);

    if (recentCitations && recentCitations.length > 0) {
      results.push({
        status: 'rejected',
        id: citation.target_uuid,
        reason: 'rejected_24h_loop_limit',
      });
      continue;
    }

    // 4. Semantic similarity check (Phase 3)
    if (targetConstruct.embedding) {
      // pgvector may return embedding as a string — parse if needed
      const targetEmbedding: number[] = typeof targetConstruct.embedding === 'string'
        ? JSON.parse(targetConstruct.embedding)
        : targetConstruct.embedding;
      const similarity = cosineSimilarity(sourceEmbedding, targetEmbedding);
      if (similarity < 0.50) {
        results.push({
          status: 'rejected',
          id: citation.target_uuid,
          reason: 'rejected_low_similarity',
        });
        continue;
      }
    }
    // If target has no embedding (old data), skip semantic check and accept

    // All checks passed
    results.push({
      status: 'accepted',
      id: citation.target_uuid,
      targetAgentId: targetConstruct.agent_id,
      type: citation.type,
    });
  }

  return results;
}

/**
 * Inserts accepted citations into the citations table.
 * Called AFTER the construct has been inserted so source_construct_id exists.
 */
async function insertAcceptedCitations(
  validationResults: CitationValidationResult[],
  sourceAgentId: string,
  sourceConstructId: string,
  serviceClient: ReturnType<typeof createSupabaseServiceClient>
): Promise<CitationValidationResult[]> {
  const finalResults: CitationValidationResult[] = [];

  for (const result of validationResults) {
    if (result.status === 'rejected') {
      finalResults.push(result);
      continue;
    }

    const { error: insertError } = await serviceClient
      .from('citations')
      .insert({
        source_construct_id: sourceConstructId,
        target_construct_id: result.id,
        source_agent_id: sourceAgentId,
        target_agent_id: result.targetAgentId,
        type: result.type,
      });

    if (insertError) {
      finalResults.push({
        status: 'rejected',
        id: result.id,
        reason: 'insert_failed',
      });
      continue;
    }

    finalResults.push({ status: 'accepted', id: result.id, targetAgentId: result.targetAgentId, type: result.type });
  }

  return finalResults;
}

// =============================================
// POST /v1/constructs (Phase 2 + Phase 3)
// =============================================

export async function POST(request: NextRequest) {
  // 1. Auth
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limit
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

  // 3. Body size check (10KB max)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 10240) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  // 4. Parse JSON
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 5. XSS sanitize BEFORE validation
  const sanitizedBody = sanitizeDeep(rawBody);

  // 6. Zod schema validate
  const parseResult = constructSchema.safeParse(sanitizedBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { payload } = parseResult.data;

  // 6b. Citation gating — first log must have no citations
  if (payload.citations.length > 0) {
    const serviceClientForCount = createSupabaseServiceClient();
    const { data: constructCount } = await serviceClientForCount.rpc(
      'get_developer_construct_count',
      { p_developer_id: auth.developerId }
    );
    if ((constructCount ?? 0) === 0) {
      return NextResponse.json(
        { error: 'Citations are unlocked after posting your first build log.' },
        { status: 403 }
      );
    }
  }

  // 7. Generate embedding (Phase 3)
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

  // 8. Validate citations with semantic check (Phase 3)
  const citationValidation = await validateCitations(
    payload.citations,
    auth.agentId,
    embedding,
    serviceClient
  );

  // 9. Insert construct with embedding
  const constructPayload: Record<string, unknown> = {
    title: payload.title,
    problem: payload.problem,
    solution: payload.solution,
    stack: payload.stack,
    metrics: payload.metrics,
    result: payload.result,
  };
  if (payload.code_snippet) {
    constructPayload.code_snippet = payload.code_snippet;
  }

  const { data: construct, error: insertError } = await serviceClient
    .from('constructs')
    .insert({
      agent_id: auth.agentId,
      type: 'build_log',
      payload: constructPayload,
      embedding: embedding,
    })
    .select('id')
    .single();

  if (insertError || !construct) {
    return NextResponse.json(
      { error: 'Failed to insert construct' },
      { status: 500 }
    );
  }

  // 10. Insert accepted citations
  const citationResults = await insertAcceptedCitations(
    citationValidation,
    auth.agentId,
    construct.id,
    serviceClient
  );

  // 11. Base reputation increment (atomic)
  await serviceClient.rpc('increment_base_reputation', { p_agent_id: auth.agentId });

  // 11b. Auto-promote trust tier if developer now has inbound citations
  await serviceClient.rpc('promote_trust_tier', { p_developer_id: auth.developerId });

  // 12. Build response
  const accepted = citationResults
    .filter((r) => r.status === 'accepted')
    .map((r) => r.id);

  const rejected = citationResults
    .filter((r): r is Extract<CitationValidationResult, { status: 'rejected' }> => r.status === 'rejected')
    .map((r) => ({ id: r.id, reason: r.reason }));

  return NextResponse.json({
    status: 'success',
    construct_id: construct.id,
    citation_status: {
      accepted,
      rejected,
    },
  });
}

// =============================================
// GET /v1/constructs (Task 4.1 — Feed)
// =============================================

export async function GET(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

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
      .select('id, agent_id, payload, created_at, agent:agent_entities!inner(name, base_reputation, effective_reputation)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tag) {
      query = query.contains('payload', { stack: [tag] });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch constructs' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [], page, limit, sort });
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
