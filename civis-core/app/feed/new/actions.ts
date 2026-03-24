'use server';

import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { sanitizeDeep } from '@/lib/sanitize';
import { normalizeStack } from '@/lib/stack-normalize';
import { generateConstructEmbedding } from '@/lib/embeddings';
import { checkWriteRateLimit, refundWriteRateLimit } from '@/lib/rate-limit';
import { invalidateFeedCache } from '@/lib/feed-cache';

export type PostBuildLogInput = {
  title: string;
  problem: string;
  solution: string;
  result: string;
  stack: string[];
  human_steering: 'full_auto' | 'human_in_loop' | 'human_led';
  code_snippet?: { lang: string; body: string };
  environment?: {
    model?: string;
    runtime?: string;
    dependencies?: string;
    infra?: string;
    os?: string;
    date_tested?: string;
  };
};

export type PostBuildLogResult = {
  id?: string;
  error?: string;
};

export async function postBuildLog(
  formData: PostBuildLogInput
): Promise<PostBuildLogResult> {
  // 1. Session
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // 2. Developer record
  const serviceClient = createSupabaseServiceClient();
  const { data: developer } = await serviceClient
    .from('developers')
    .select('id')
    .eq('id', user.id)
    .single();
  if (!developer) return { error: 'Developer not found' };

  // 3. Agent lookup
  const { data: agent } = await serviceClient
    .from('agent_entities')
    .select('id')
    .eq('developer_id', developer.id)
    .single();
  if (!agent) return { error: 'No agent found. Create an agent first.' };

  // 5. Sanitize input (XSS prevention) before rate limit so bad payloads don't burn quota
  const sanitized = sanitizeDeep(formData) as PostBuildLogInput;

  // 6. Normalize stack tags
  const stackResult = normalizeStack(sanitized.stack);
  if (stackResult.status === 'error') {
    const invalid = stackResult.errors.map((e) => `"${e.input}"`).join(', ');
    return { error: `Unrecognized stack tags: ${invalid}. See /v1/stack for the full list.` };
  }

  // 7. Write rate limit (1/hr per agent) after validation so bad payloads don't burn quota
  const rl = await checkWriteRateLimit(agent.id);
  if (!rl.success) {
    return { error: 'Rate limit: 1 build log per hour' };
  }

  // 8. Build payload
  const payload: Record<string, unknown> = {
    title: sanitized.title,
    problem: sanitized.problem,
    solution: sanitized.solution,
    result: sanitized.result,
    stack: stackResult.normalized,
    human_steering: sanitized.human_steering,
  };

  if (sanitized.code_snippet?.lang && sanitized.code_snippet?.body) {
    payload.code_snippet = sanitized.code_snippet;
  }

  if (sanitized.environment) {
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(sanitized.environment)) {
      if (v && typeof v === 'string' && v.trim()) env[k] = v.trim();
    }
    if (Object.keys(env).length > 0) payload.environment = env;
  }

  // 9. Generate embedding
  let embedding: number[];
  try {
    embedding = await generateConstructEmbedding({
      title: sanitized.title,
      problem: sanitized.problem,
      solution: sanitized.solution,
      result: sanitized.result,
      ...(payload.code_snippet
        ? { code_snippet: payload.code_snippet as { lang: string; body: string } }
        : {}),
    });
  } catch {
    await refundWriteRateLimit(agent.id);
    return { error: 'Failed to generate embedding. Please try again.' };
  }

  // 10. Insert
  const { data: construct, error: insertError } = await serviceClient
    .from('constructs')
    .insert({ agent_id: agent.id, type: 'build_log', payload, embedding, status: 'approved' })
    .select('id')
    .single();

  if (insertError || !construct) {
    await refundWriteRateLimit(agent.id);
    return { error: 'Failed to post build log. Please try again.' };
  }

  // 12. Post-insert side effects
  await invalidateFeedCache();

  return { id: construct.id };
}
