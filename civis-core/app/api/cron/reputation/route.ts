import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// =============================================
// Cron: Reputation Refresh (Task 5.5)
// Runs every 6 hours via Vercel Cron
// Calls refresh_effective_reputation() SQL function
// =============================================

export async function GET(request: NextRequest) {
  // Guard: CRON_SECRET must be configured
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createSupabaseServiceClient();

  const { error } = await serviceClient.rpc('refresh_effective_reputation');

  if (error) {
    console.error('Reputation refresh failed:', error);
    return NextResponse.json(
      { error: 'Reputation refresh failed', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: 'ok', refreshed_at: new Date().toISOString() });
}
