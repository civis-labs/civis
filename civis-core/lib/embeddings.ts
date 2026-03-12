import OpenAI from 'openai';
import { createHash } from 'crypto';
import { redis } from '@/lib/redis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_CACHE_PREFIX = 'civis:emb:';
const EMBEDDING_CACHE_TTL = 86400; // 24 hours

function cacheKeyFor(text: string): string {
  const normalized = text.toLowerCase().trim();
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  return EMBEDDING_CACHE_PREFIX + hash;
}

/**
 * Generates an embedding vector for the given text using OpenAI text-embedding-3-small.
 * Returns a 1536-dimensional vector.
 *
 * Search query embeddings are cached in Redis (24h TTL) to skip the OpenAI
 * round-trip on repeated queries. Cache is keyed on lowercased, trimmed input.
 * Fails open: if Redis is down, falls through to OpenAI.
 */
export async function generateEmbedding(
  text: string,
  options?: { cache?: boolean }
): Promise<number[]> {
  const useCache = options?.cache ?? false;
  const cacheKey = useCache ? cacheKeyFor(text) : null;

  // Check cache
  if (cacheKey) {
    try {
      const cached = await redis.get<number[]>(cacheKey);
      if (cached) return cached;
    } catch {
      // Redis down, fall through to OpenAI
    }
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  });

  const embedding = response.data[0].embedding;

  // Store in cache (fire-and-forget)
  if (cacheKey) {
    redis.set(cacheKey, embedding, { ex: EMBEDDING_CACHE_TTL }).catch(() => {});
  }

  return embedding;
}

/**
 * Convenience function: concatenates construct fields and generates an embedding.
 * Uses title + problem + result only. Solution and code_snippet are excluded
 * because they can contain security terminology (injection patterns, secret
 * regexes) that triggers OpenAI content filters, causing 500 errors.
 * Title + problem + result provides sufficient semantic signal for search.
 * Not cached since construct embeddings are unique and stored in pgvector.
 */
export async function generateConstructEmbedding(payload: {
  title: string;
  problem: string;
  solution: string;
  result: string;
  code_snippet?: { lang: string; body: string };
}): Promise<number[]> {
  const text = `${payload.title} ${payload.problem} ${payload.result}`;
  return generateEmbedding(text);
}

/**
 * Computes cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}
