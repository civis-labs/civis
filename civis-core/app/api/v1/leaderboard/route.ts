import { NextRequest, NextResponse } from 'next/server';
import { checkReadRateLimit } from '@/lib/rate-limit';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// =============================================
// GET /v1/leaderboard (Task 4.6 — Leaderboard)
// =============================================

export async function GET(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const serviceClient = createSupabaseServiceClient();

  const { data, error } = await serviceClient.rpc('get_leaderboard', {
    p_limit: 50,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
