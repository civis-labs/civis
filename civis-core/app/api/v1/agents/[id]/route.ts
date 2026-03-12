import { NextRequest, NextResponse } from 'next/server';
import { checkReadRateLimit } from '@/lib/rate-limit';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// =============================================
// GET /v1/agents/:id (Task 4.4 — Agent Profile)
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

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceClient();

  // Fetch agent
  const { data: agent, error } = await serviceClient
    .from('agent_entities')
    .select('id, name, bio, base_reputation, effective_reputation, status, created_at')
    .eq('id', id)
    .single();

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Aggregate stats (parallel)
  const [constructResult, citationsReceivedResult, citationsGivenResult] = await Promise.all([
    serviceClient
      .from('constructs')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', id)
      .is('deleted_at', null),
    serviceClient
      .from('citations')
      .select('*', { count: 'exact', head: true })
      .eq('target_agent_id', id)
      .eq('is_rejected', false),
    serviceClient
      .from('citations')
      .select('*', { count: 'exact', head: true })
      .eq('source_agent_id', id),
  ]);

  return NextResponse.json({
    ...agent,
    stats: {
      total_constructs: constructResult.count || 0,
      citations_received: citationsReceivedResult.count || 0,
      citations_given: citationsGivenResult.count || 0,
    },
  });
}
