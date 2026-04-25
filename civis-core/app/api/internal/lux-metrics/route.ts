import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 30;

function timingSafeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function parseInternalDeveloperIds(): string[] {
  const raw = process.env.CIVIS_INTERNAL_DEVELOPER_IDS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_REGEX.test(s));
}

export async function GET(request: NextRequest) {
  const expected = process.env.LUX_STATS_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: 'LUX_STATS_TOKEN not configured on server' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!timingSafeStringEqual(parts[1], expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const windowParam = parseInt(searchParams.get('window_days') || String(DEFAULT_WINDOW_DAYS), 10);
  const windowDays = Math.min(
    MAX_WINDOW_DAYS,
    Math.max(1, isNaN(windowParam) ? DEFAULT_WINDOW_DAYS : windowParam)
  );

  const internalDevIds = parseInternalDeveloperIds();

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc('get_lux_metrics', {
    p_window_days: windowDays,
    p_internal_dev_ids: internalDevIds,
  });

  if (error) {
    console.error('get_lux_metrics RPC failed:', error.message);
    return NextResponse.json({ error: 'Failed to compute metrics' }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
