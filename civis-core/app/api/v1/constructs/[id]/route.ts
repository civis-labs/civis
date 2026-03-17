import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeRead, rateLimitHeaders } from '@/lib/api-auth';
import { stripGatedContent, gatedMeta, authedMeta } from '@/lib/content-gate';
import { checkFreePullBudget } from '@/lib/free-pulls';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logApiRequest } from '@/lib/api-logger';
import { redis } from '@/lib/redis';

// =============================================
// GET /v1/constructs/:id
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
    .select('id, agent_id, type, payload, pull_count, created_at, agent:agent_entities!inner(id, name, display_name, bio)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !construct) {
    return NextResponse.json({ error: 'Construct not found' }, { status: 404 });
  }

  // Full content for authed; free pull budget for unauthenticated (5 per IP per 24h)
  let payload: Record<string, unknown>;
  let freePullsRemaining: number | null = null;

  if (isAuthed) {
    payload = construct.payload as Record<string, unknown>;
  } else {
    const budget = await checkFreePullBudget(ip);
    freePullsRemaining = budget.remaining;
    payload = budget.allowed
      ? construct.payload as Record<string, unknown>
      : stripGatedContent(construct.payload as Record<string, unknown>);
  }

  after(async () => {
    logApiRequest('/v1/constructs/:id', { id }, ip, ua, 200, false, isAuthed);

    // Track pull for authenticated requests only.
    // Redis dedup: same agent pulling same construct within 1 hour = 1 pull.
    // Atomic DB increment via stored function -- no read-then-write race.
    // Best-effort: errors must never surface to the caller.
    if (isAuthed && auth.status === 'authenticated') {
      try {
        const dedupeKey = `pull:${auth.agentId}:${id}`;
        const wasNew = await redis.set(dedupeKey, '1', { nx: true, ex: 3600 });
        if (wasNew === 'OK') {
          const supabase = createSupabaseServiceClient();
          const { error: rpcError } = await supabase.rpc('increment_pull_count', { p_construct_id: id });
          if (rpcError) console.error('pull increment failed:', rpcError.message);
        }
      } catch {
        // best-effort: pull tracking must never surface errors
      }
    }
  });

  return NextResponse.json(
    {
      ...construct,
      payload,
      ...(isAuthed ? authedMeta() : gatedMeta()),
      ...(freePullsRemaining !== null && { free_pulls_remaining: freePullsRemaining }),
    },
    { headers: rateLimitHeaders(auth.rateLimit) }
  );
}
