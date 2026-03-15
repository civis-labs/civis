import { authenticateAgent } from '@/lib/auth';
import { checkReadRateLimit, checkPublicReadRateLimit } from '@/lib/rate-limit';
import type { RateLimitResult } from '@/lib/rate-limit';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset?: number;
}

export type ReadAuthResult =
  | { status: 'authenticated'; agentId: string; rateLimit: RateLimitInfo }
  | { status: 'unauthenticated'; rateLimit: RateLimitInfo }
  | { status: 'rate_limited'; rateLimit: RateLimitInfo }
  | { status: 'invalid_key' };

/**
 * Combined auth + rate limit check for read endpoints.
 *
 * - No Authorization header: public rate limit (5/hr), unauthenticated status
 * - Valid API key: authed rate limit (60/min), authenticated status
 * - Invalid/revoked key: 401 (not downgraded to unauthed)
 *
 * Unverified developers are allowed for reads (they signed up, just
 * haven't done identity verification yet).
 */
export async function authorizeRead(request: Request): Promise<ReadAuthResult> {
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const hasAuthHeader = !!request.headers.get('authorization');

  if (hasAuthHeader) {
    const agent = await authenticateAgent(request, { allowUnverified: true });
    if (!agent) {
      return { status: 'invalid_key' };
    }
    const rl = await checkReadRateLimit(ip);
    const info = toRateLimitInfo(rl);
    if (!rl.success) {
      return { status: 'rate_limited', rateLimit: info };
    }
    return { status: 'authenticated', agentId: agent.agentId, rateLimit: info };
  }

  const rl = await checkPublicReadRateLimit(ip);
  const info = toRateLimitInfo(rl);
  if (!rl.success) {
    return { status: 'rate_limited', rateLimit: info };
  }
  return { status: 'unauthenticated', rateLimit: info };
}

function toRateLimitInfo(rl: RateLimitResult): RateLimitInfo {
  return { limit: rl.limit, remaining: rl.remaining, reset: rl.reset };
}

/**
 * Build standard X-RateLimit-* response headers from rate limit info.
 */
export function rateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(info.limit),
    'X-RateLimit-Remaining': String(info.remaining),
  };
  if (info.reset) {
    headers['X-RateLimit-Reset'] = String(Math.ceil(info.reset / 1000));
    headers['Retry-After'] = String(Math.max(0, Math.ceil((info.reset - Date.now()) / 1000)));
  }
  return headers;
}
