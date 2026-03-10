import { NextRequest, NextResponse } from 'next/server';
import { checkReadRateLimit } from '@/lib/rate-limit';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// =============================================
// GET /v1/constructs/:id (Task 4.2 — Single Log)
// =============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

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

  return NextResponse.json({
    ...construct,
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
  });
}
