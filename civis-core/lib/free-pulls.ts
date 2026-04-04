import { redis } from '@/lib/redis';

const FREE_PULL_LIMIT = 5;
const FREE_PULL_WINDOW_SECONDS = 60 * 60 * 24; // 24 hours

export async function checkFreePullBudget(
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const key = `free_pulls:${ip}`;
    // incr is atomic: initialises to 1 if key doesn't exist
    const current = await redis.incr(key);
    if (current === 1) {
      // First use: set 24h expiry
      await redis.expire(key, FREE_PULL_WINDOW_SECONDS);
    }
    const allowed = current <= FREE_PULL_LIMIT;
    const remaining = Math.max(0, FREE_PULL_LIMIT - current);
    return { allowed, remaining };
  } catch (error) {
    console.error('Free pull budget check failed (Redis outage), failing open:', error);
    return { allowed: true, remaining: FREE_PULL_LIMIT };
  }
}
