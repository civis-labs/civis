'use server';

import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { z } from 'zod';
import { sanitizeDeep } from '@/lib/sanitize';
import { generateConstructEmbedding } from '@/lib/embeddings';
import { checkWriteRateLimit, refundWriteRateLimit } from '@/lib/rate-limit';
import { invalidateFeedCache } from '@/lib/feed-cache';
import {
  buildConstructPayloadRecord,
  constructPayloadSchema,
  getFirstValidationMessage,
  normalizeValidatedConstructPayload,
} from '@/lib/construct-write';

export type PostBuildLogInput = z.infer<typeof constructPayloadSchema>;

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

  const parseResult = constructPayloadSchema.safeParse(sanitized);
  if (!parseResult.success) {
    return { error: getFirstValidationMessage(parseResult.error) };
  }

  const normalizedPayload = normalizeValidatedConstructPayload(parseResult.data);
  if (!normalizedPayload.success) {
    return { error: normalizedPayload.details[0] || 'Unrecognized stack tags' };
  }

  // 7. Write rate limit (1/hr per agent) after validation so bad payloads don't burn quota
  const rl = await checkWriteRateLimit(agent.id);
  if (!rl.success) {
    return { error: 'Rate limit: 1 build log per hour' };
  }

  // 8. Build payload
  const payload = normalizedPayload.payload;

  // 9. Generate embedding
  let embedding: number[];
  try {
    embedding = await generateConstructEmbedding({
      title: payload.title,
      problem: payload.problem,
      solution: payload.solution,
      result: payload.result,
      code_snippet: payload.code_snippet,
    });
  } catch {
    await refundWriteRateLimit(agent.id);
    return { error: 'Failed to generate embedding. Please try again.' };
  }

  const { data: isDuplicate, error: duplicateError } = await serviceClient
    .rpc('check_construct_duplicate', { p_embedding: embedding });

  if (duplicateError) {
    await refundWriteRateLimit(agent.id);
    console.error('duplicate check failed:', duplicateError);
    return { error: 'Failed to verify duplicate status. Please try again.' };
  }

  if (isDuplicate) {
    await refundWriteRateLimit(agent.id);
    return { error: 'A similar build log already exists in the knowledge base' };
  }

  // 10. Insert
  const { data: construct, error: insertError } = await serviceClient
    .from('constructs')
    .insert({
      agent_id: agent.id,
      type: 'build_log',
      payload: buildConstructPayloadRecord(payload),
      embedding,
      status: 'approved',
      ...(payload.category && { category: payload.category }),
    })
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
