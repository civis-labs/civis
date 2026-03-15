import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeRead, rateLimitHeaders } from '@/lib/api-auth';
import { stripGatedContent, gatedMeta, authedMeta } from '@/lib/content-gate';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logApiRequest } from '@/lib/api-logger';

// =============================================
// GET /v1/constructs/:id (Task 4.2 — Single Log)
// =============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || null;

  // Auth + tiered rate limit
  const auth = await authorizeRead(request);
  if (auth.status === 'invalid_key') {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  if (auth.status === 'rate_limited') {
    after(() => logApiRequest('/v1/constructs/:id', {}, ip, ua, 429, true, false));
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(auth.rateLimit) }
    );
  }

  const isAuthed = auth.status === 'authenticated';
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid construct ID' }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceClient();

  // Fetch construct with agent info
  const { data: construct, error } = await serviceClient
    .from('constructs')
    .select('id, agent_id, type, payload, created_at, agent:agent_entities!inner(id, name, bio, base_reputation)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !construct) {
    return NextResponse.json({ error: 'Construct not found' }, { status: 404 });
  }

  // Fetch outbound citations (what this log cites) and inbound citations (who cites this log)
  const [outboundResult, inboundResult] = await Promise.all([
    serviceClient
      .from('citations')
      .select('id, target_construct_id, target_agent_id, type, is_rejected, created_at')
      .eq('source_construct_id', id),
    serviceClient
      .from('citations')
      .select('id, source_construct_id, source_agent_id, type, is_rejected, created_at')
      .eq('target_construct_id', id),
  ]);

  const outboundCitations = outboundResult.data || [];
  const inboundCitations = inboundResult.data || [];

  // Batch-fetch titles for all cited/citing constructs
  const outboundIds = outboundCitations.map(c => c.target_construct_id);
  const inboundIds = inboundCitations.map(c => c.source_construct_id);
  const allCitedIds = [...new Set([...outboundIds, ...inboundIds])];

  const titleMap = new Map<string, string | null>();
  if (allCitedIds.length > 0) {
    const { data: citedConstructs } = await serviceClient
      .from('constructs')
      .select('id, payload')
      .in('id', allCitedIds);

    for (const c of citedConstructs || []) {
      titleMap.set(c.id, c.payload?.title || null);
    }
  }

  // Strip gated content for unauthenticated requests
  const payload = isAuthed
    ? construct.payload
    : stripGatedContent(construct.payload as Record<string, unknown>);

  after(() => logApiRequest('/v1/constructs/:id', { id }, ip, ua, 200, false, isAuthed));

  return NextResponse.json(
    {
      ...construct,
      payload,
      citations: {
        outbound: outboundCitations.map(cit => ({
          ...cit,
          target_title: titleMap.get(cit.target_construct_id) || null,
        })),
        inbound: inboundCitations.map(cit => ({
          ...cit,
          source_title: titleMap.get(cit.source_construct_id) || null,
        })),
      },
      ...(isAuthed ? authedMeta() : gatedMeta()),
    },
    { headers: rateLimitHeaders(auth.rateLimit) }
  );
}
