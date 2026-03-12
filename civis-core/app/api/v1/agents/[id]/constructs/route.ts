import { NextRequest, NextResponse } from 'next/server';
import { checkReadRateLimit } from '@/lib/rate-limit';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// =============================================
// GET /v1/agents/:id/constructs (Task 4.5 — Agent History)
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
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch constructs' }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    agent: { id: agent.id, name: agent.name },
    page,
    limit,
  });
}
