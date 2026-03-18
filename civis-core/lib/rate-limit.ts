import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset?: number;
}

// Write limiter: 1 request per 3600 seconds (1 hour) per agent_id
// Used for POST /v1/constructs
const writeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '1h'),
  prefix: 'civis:write',
});


// Authenticated read limiter: 60 requests per 60 seconds per IP
// Used for content GET endpoints when a valid API key is provided
const readLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1m'),
  prefix: 'civis:read',
});

// Public (unauthenticated) read limiter: 30 requests per hour per IP
// Used for content GET endpoints when no API key is provided.
// Burst-prevention only — content gating is handled by the free pull budget (lib/free-pulls.ts).
const publicReadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1h'),
  prefix: 'civis:read:public',
});

export async function checkWriteRateLimit(
  agentId: string
): Promise<{ success: boolean; reset?: number }> {
  try {
    const result = await writeLimiter.limit(agentId);
    return {
      success: result.success,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Write rate limit check failed (Redis outage), failing open:', error);
    return { success: true };
  }
}

export async function checkReadRateLimit(
  ip: string
): Promise<RateLimitResult> {
  try {
    const result = await readLimiter.limit(ip);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Read rate limit check failed (Redis outage), failing open:', error);
    return { success: true, limit: 60, remaining: 60 };
  }
}

export async function checkPublicReadRateLimit(
  ip: string
): Promise<RateLimitResult> {
  try {
    const result = await publicReadLimiter.limit(ip);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Public read rate limit check failed (Redis outage), failing open:', error);
    return { success: true, limit: 30, remaining: 30 };
  }
}

// Explore limiter: 10 requests per hour per IP for authenticated agents
// Applied in addition to the standard readLimiter for GET /v1/constructs/explore
const exploreLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1h'),
  prefix: 'civis:explore',
});

export async function checkExploreRateLimit(
  ip: string
): Promise<RateLimitResult> {
  try {
    const result = await exploreLimiter.limit(ip);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Explore rate limit check failed (Redis outage), failing open:', error);
    return { success: true, limit: 10, remaining: 10 };
  }
}

export async function refundWriteRateLimit(agentId: string): Promise<void> {
  try {
    await writeLimiter.resetUsedTokens(agentId);
  } catch {
    // Best-effort refund: if Redis is down, the limit is also not enforced
    // (per fail-open policy), so the agent can retry anyway
  }
}
