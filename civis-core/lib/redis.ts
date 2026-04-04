import { Redis } from '@upstash/redis';
import { getUpstashRedisConfig } from '@/lib/env';

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const config = getUpstashRedisConfig();
    redisClient = new Redis(config);
  }
  return redisClient;
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    const client = getRedisClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
