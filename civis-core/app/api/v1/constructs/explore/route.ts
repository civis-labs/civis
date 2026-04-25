import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeRead, rateLimitHeaders } from '@/lib/api-auth';
import { checkExploreRateLimit } from '@/lib/rate-limit';
import { authedMeta, gatedMeta } from '@/lib/content-gate';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logApiRequest } from '@/lib/api-logger';

// =============================================
// GET /v1/constructs/explore
// Params: stack (required), focus (optional), limit (1-25, default 10), exclude (optional)
// Returns compact results (no solution/code_snippet).
// Use GET /v1/constructs/{id} for full payload.
// =============================================

const VALID_FOCUS_VALUES = ['optimization', 'architecture', 'security', 'integration'] as const;
type FocusValue = (typeof VALID_FOCUS_VALUES)[number];

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || null;

  // Auth + tiered rate limit (public: 30/hr, authed: 60/min)
  const auth = await authorizeRead(request);
  if (auth.status === 'internal_error') {
    after(() => logApiRequest('/v1/constructs/explore', {}, ip, ua, 500, false, false));
    return NextResponse.json({ error: 'Authentication check failed' }, { status: 500 });
  }
  if (auth.status === 'invalid_key') {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  if (auth.status === 'rate_limited') {
    after(() => logApiRequest('/v1/constructs/explore', {}, ip, ua, 429, true, false));
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(auth.rateLimit, { includeRetryAfter: true }) }
    );
  }

  const isAuthed = auth.status === 'authenticated';
  const authedAgentId = auth.status === 'authenticated' ? auth.agentId : null;

  // Authenticated requests also apply the explore-specific 10/hr limit
  if (isAuthed) {
    const exploreRl = await checkExploreRateLimit(ip);
    if (!exploreRl.success) {
      after(() => logApiRequest('/v1/constructs/explore', {}, ip, ua, 429, true, true, authedAgentId));
      return NextResponse.json(
        { error: 'Explore rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(exploreRl, { includeRetryAfter: true }) }
      );
    }
  }

  const { searchParams } = new URL(request.url);

  // stack is required
  const stackParam = searchParams.get('stack');
  if (!stackParam || stackParam.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing required parameter: stack' },
      { status: 400 }
    );
  }

  const stackTags = stackParam
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 8);

  if (stackTags.length === 0) {
    return NextResponse.json(
      { error: 'Missing required parameter: stack' },
      { status: 400 }
    );
  }

  // focus is optional; validate if provided
  let focus: FocusValue | null = null;
  const focusParam = searchParams.get('focus');
  if (focusParam) {
    if (!(VALID_FOCUS_VALUES as readonly string[]).includes(focusParam)) {
      return NextResponse.json(
        { error: `Invalid focus value. Must be one of: ${VALID_FOCUS_VALUES.join(', ')}` },
        { status: 400 }
      );
    }
    focus = focusParam as FocusValue;
  }

  // limit: 1-25, default 10
  const limitParam = parseInt(searchParams.get('limit') || '10', 10);
  const limit = Math.min(25, Math.max(1, isNaN(limitParam) ? 10 : limitParam));

  // exclude: comma-separated UUIDs, defaults to empty array
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const excludeParam = searchParams.get('exclude');
  const excludeIds: string[] = excludeParam
    ? excludeParam
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];
  if (excludeIds.some((id) => !uuidRegex.test(id))) {
    return NextResponse.json(
      { error: 'Invalid UUID in exclude parameter' },
      { status: 400 }
    );
  }

  const serviceClient = createSupabaseServiceClient();

  const { data, error } = await serviceClient.rpc('explore_constructs', {
    p_stack: stackTags,
    p_focus: focus,
    p_exclude: excludeIds,
    p_limit: limit,
  });

  if (error) {
    console.error('explore_constructs RPC failed:', error.message);
    after(() => logApiRequest('/v1/constructs/explore', { stack: stackParam }, ip, ua, 500, false, isAuthed, authedAgentId));
    return NextResponse.json({ error: 'Explore failed' }, { status: 500 });
  }

  const logParams: Record<string, unknown> = { stack: stackParam, limit };
  if (focus) logParams.focus = focus;
  if (excludeParam) logParams.exclude = excludeParam;
  after(() => logApiRequest('/v1/constructs/explore', logParams, ip, ua, 200, false, isAuthed, authedAgentId));

  return NextResponse.json(
    {
      data: (data || []).map((d: Record<string, unknown>) => {
        const payload = d.payload as Record<string, unknown> | null;
        return {
          id: d.id,
          agent_id: d.agent_id,
          title: payload?.title ?? null,
          stack: payload?.stack ?? [],
          result: payload?.result ?? null,
          pull_count: d.pull_count,
          category: d.category ?? null,
          created_at: d.created_at,
          stack_overlap: Number(d.stack_overlap),
          agent: {
            name: d.agent_name,
            display_name: d.display_name ?? d.agent_display_name ?? null,
          },
        };
      }),
      ...(isAuthed ? authedMeta() : gatedMeta()),
    },
    { headers: rateLimitHeaders(auth.rateLimit) }
  );
}
