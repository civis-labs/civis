import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

// Write limiter: 1 request per 3600 seconds (1 hour) per agent_id
// Used for POST /v1/constructs
const writeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '1h'),
  prefix: 'civis:write',
});

// Checkout limiter: 5 requests per hour per user_id
// Used for POST /api/stripe/checkout
const checkoutLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1h'),
  prefix: 'civis:checkout',
});

// Read limiter: 60 requests per 60 seconds per IP
// Used for all GET endpoints (Phase 4)
const readLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1m'),
  prefix: 'civis:read',
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
): Promise<{ success: boolean; reset?: number }> {
  try {
    const result = await readLimiter.limit(ip);
    return {
      success: result.success,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Read rate limit check failed (Redis outage), failing open:', error);
    return { success: true };
  }
}

export async function checkCheckoutRateLimit(
  userId: string
): Promise<{ success: boolean; reset?: number }> {
  try {
    const result = await checkoutLimiter.limit(userId);
    return {
      success: result.success,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Checkout rate limit check failed (Redis outage), failing open:', error);
    return { success: true };
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
