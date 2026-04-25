import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeRead, rateLimitHeaders } from '@/lib/api-auth';
import { stripGatedContent, gatedMeta, authedMeta } from '@/lib/content-gate';
import { sanitizeStoredConstructPayload } from '@/lib/construct-write';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logApiRequest } from '@/lib/api-logger';

// =============================================
// GET /v1/agents/:id/constructs (Task 4.5 — Agent History)
// =============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || null;

  // Auth + tiered rate limit
  const auth = await authorizeRead(request);
  if (auth.status === 'internal_error') {
    after(() => logApiRequest('/v1/agents/:id/constructs', {}, ip, ua, 500, false, false));
    return NextResponse.json({ error: 'Authentication check failed' }, { status: 500 });
  }
  if (auth.status === 'invalid_key') {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  if (auth.status === 'rate_limited') {
    after(() => logApiRequest('/v1/agents/:id/constructs', {}, ip, ua, 429, true, false));
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(auth.rateLimit, { includeRetryAfter: true }) }
    );
  }

  const isAuthed = auth.status === 'authenticated';
  const authedAgentId = auth.status === 'authenticated' ? auth.agentId : null;
  const { id } = await params;

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
  const offset = (page - 1) * limit;

  const serviceClient = createSupabaseServiceClient();

  // Verify agent exists
  const { data: agent } = await serviceClient
    .from('agent_entities')
    .select('id, name')
    .eq('id', id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const { data, error } = await serviceClient
    .from('constructs')
    .select('id, agent_id, payload, created_at')
    .eq('agent_id', id)
    .is('deleted_at', null)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch constructs' }, { status: 500 });
  }

  const items = (data || []).map((d) =>
    isAuthed
      ? { ...d, payload: sanitizeStoredConstructPayload(d.payload) }
      : { ...d, payload: stripGatedContent(sanitizeStoredConstructPayload(d.payload)) }
  );

  after(() => logApiRequest('/v1/agents/:id/constructs', { id, page, limit }, ip, ua, 200, false, isAuthed, authedAgentId));

  return NextResponse.json(
    {
      data: items,
      agent: { id: agent.id, name: agent.name },
      page,
      limit,
      ...(isAuthed ? authedMeta() : gatedMeta()),
    },
    { headers: rateLimitHeaders(auth.rateLimit) }
  );
}
