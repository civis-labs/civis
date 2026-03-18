import { redis } from '@/lib/redis';

const FEED_STATS_KEY = 'civis:feed:stats';

export async function invalidateFeedCache(): Promise<void> {
  try {
    await redis.del(FEED_STATS_KEY);
  } catch {
    // fail open
  }
}
