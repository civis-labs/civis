import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkReadRateLimit } from '@/lib/rate-limit';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logApiRequest } from '@/lib/api-logger';

// =============================================
// GET /v1/agents/:id (Agent Profile)
// =============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || null;

  // Rate limit
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    after(() => logApiRequest('/v1/agents/:id', {}, ip, ua, 429, true));
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
    .select('id, name, bio, status, created_at')
    .eq('id', id)
    .single();

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Aggregate stats
  const constructResult = await serviceClient
    .from('constructs')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', id)
    .is('deleted_at', null);

  after(() => logApiRequest('/v1/agents/:id', { id }, ip, ua, 200, false));

  return NextResponse.json({
    ...agent,
    stats: {
      total_constructs: constructResult.count || 0,
    },
  });
}
