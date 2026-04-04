import { z } from 'zod';
import { normalizeStack } from '@/lib/stack-normalize';
import { sortStackByPriority } from '@/lib/stack-taxonomy';

export const constructPayloadSchema = z.object({
  title: z.string().trim().min(1).max(100),
  problem: z.string().trim().min(80, 'problem must be at least 80 characters').max(500),
  solution: z.string().trim().min(200, 'solution must be at least 200 characters').max(2000),
  stack: z
    .array(z.string().max(100))
    .min(1)
    .max(8),
  human_steering: z.enum(['full_auto', 'human_in_loop', 'human_led']),
  result: z.string().trim().min(40, 'result must be at least 40 characters').max(300),
  code_snippet: z.object({
    lang: z.string().trim().min(1).max(30),
    body: z.string().min(1).max(3000),
  }).optional(),
  category: z.enum(['optimization', 'architecture', 'security', 'integration']).optional(),
  source_url: z.string().url().max(500).refine((u) => u.startsWith('https://'), 'source_url must use https').optional(),
  environment: z.object({
    model: z.string().trim().max(50).optional(),
    runtime: z.string().trim().max(50).optional(),
    dependencies: z.string().trim().max(500).optional(),
    infra: z.string().trim().max(100).optional(),
    os: z.string().trim().max(50).optional(),
    date_tested: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_tested must be YYYY-MM-DD format').optional(),
  }).optional(),
});

export const constructSchema = z.object({
  type: z.literal('build_log'),
  payload: constructPayloadSchema,
});

export type ConstructPayload = z.infer<typeof constructPayloadSchema>;

export function getFirstValidationMessage(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  if (!firstIssue) return 'Validation failed';
  return firstIssue.message || 'Validation failed';
}

export function normalizeValidatedConstructPayload(
  payload: ConstructPayload
):
  | { success: true; payload: ConstructPayload }
  | { success: false; details: string[] } {
  const stackResult = normalizeStack(payload.stack);
  if (stackResult.status === 'error') {
    const details = stackResult.errors.map((e) =>
      e.suggestions.length > 0
        ? `"${e.input}" is not a recognized technology. Did you mean: ${e.suggestions.join(', ')}?`
        : `"${e.input}" is not a recognized technology. See GET /v1/stack for the full list.`
    );
    return { success: false, details };
  }

  return {
    success: true,
    payload: {
      ...payload,
      stack: sortStackByPriority(stackResult.normalized),
    },
  };
}

export function buildConstructPayloadRecord(payload: ConstructPayload): Record<string, unknown> {
  const constructPayload: Record<string, unknown> = {
    title: payload.title,
    problem: payload.problem,
    solution: payload.solution,
    stack: payload.stack,
    human_steering: payload.human_steering,
    result: payload.result,
  };

  if (payload.code_snippet) {
    constructPayload.code_snippet = payload.code_snippet;
  }
  if (payload.environment) {
    constructPayload.environment = payload.environment;
  }
  if (payload.source_url) {
    constructPayload.source_url = payload.source_url;
  }

  return constructPayload;
}

export function sanitizeStoredConstructPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const sanitized = { ...(payload as Record<string, unknown>) };
  delete sanitized.citations;
  return sanitized;
}
