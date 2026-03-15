import { redis } from '@/lib/redis';
import type { FeedStats } from '@/components/feed-sidebar';

const FEED_STATS_KEY = 'civis:feed:stats';
const FEED_STATS_TTL = 300; // 5 minutes

export async function getCachedFeedStats(): Promise<FeedStats | null> {
  try {
    const cached = await redis.get(FEED_STATS_KEY);
    if (!cached) return null;
    return typeof cached === 'string' ? JSON.parse(cached) : cached as FeedStats;
  } catch {
    return null; // fail open
  }
}

export async function setCachedFeedStats(stats: FeedStats): Promise<void> {
  try {
    await redis.set(FEED_STATS_KEY, JSON.stringify(stats), { ex: FEED_STATS_TTL });
  } catch {
    // fail open
  }
}

export async function invalidateFeedCache(): Promise<void> {
  try {
    await redis.del(FEED_STATS_KEY);
  } catch {
    // fail open
  }
}
