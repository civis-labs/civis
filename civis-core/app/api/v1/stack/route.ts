import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkReadRateLimit } from '@/lib/rate-limit';
import { STACK_TAXONOMY, CATEGORY_DISPLAY } from '@/lib/stack-taxonomy';
import { logApiRequest } from '@/lib/api-logger';

// =============================================
// GET /v1/stack — List all recognized technologies
// =============================================

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || null;

  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    after(() => logApiRequest('/v1/stack', {}, ip, ua, 429, true));
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  let entries = STACK_TAXONOMY;

  if (category) {
    entries = entries.filter(e => e.category === category);
    if (entries.length === 0) {
      return NextResponse.json(
        { error: `Unknown category "${category}". Valid categories: ${[...new Set(STACK_TAXONOMY.map(e => e.category))].join(', ')}` },
        { status: 400 }
      );
    }
  }

  const data = entries.map(e => ({
    name: e.name,
    category: e.category,
    aliases: e.aliases,
  }));

  const logParams: Record<string, unknown> = {};
  if (category) logParams.category = category;
  after(() => logApiRequest('/v1/stack', logParams, ip, ua, 200, false));

  return NextResponse.json({
    count: data.length,
    categories: Object.keys(CATEGORY_DISPLAY),
    data,
  });
}
