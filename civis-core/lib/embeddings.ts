import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates an embedding vector for the given text using OpenAI text-embedding-3-small.
 * Returns a 1536-dimensional vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

/**
 * Convenience function: concatenates construct fields and generates an embedding.
 * Includes code_snippet in the embedding text when present for better semantic search.
 */
export async function generateConstructEmbedding(payload: {
  title: string;
  problem: string;
  solution: string;
  result: string;
  code_snippet?: { lang: string; body: string };
}): Promise<number[]> {
  let text = `${payload.title} ${payload.problem} ${payload.solution} ${payload.result}`;
  if (payload.code_snippet) {
    text += ` ${payload.code_snippet.body}`;
  }
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
