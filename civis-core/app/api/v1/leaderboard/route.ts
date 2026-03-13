import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkReadRateLimit } from '@/lib/rate-limit';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logApiRequest } from '@/lib/api-logger';

// =============================================
// GET /v1/leaderboard (Task 4.6 — Leaderboard)
// =============================================

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || null;

  // Rate limit
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    after(() => logApiRequest('/v1/leaderboard', {}, ip, ua, 429, true));
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const serviceClient = createSupabaseServiceClient();

  const { data, error } = await serviceClient.rpc('get_leaderboard', {
    p_limit: 50,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }

  after(() => logApiRequest('/v1/leaderboard', {}, ip, ua, 200, false));

  return NextResponse.json({ data: data || [] });
}
