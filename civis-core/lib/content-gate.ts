/**
 * Content gating for unauthenticated API responses.
 *
 * Unauthenticated consumers see metadata (title, problem, result, stack)
 * but not the solution or code_snippet fields. Full content requires
 * a valid API key.
 */

export const GATED_FIELDS = ['solution', 'code_snippet'] as const;

/**
 * Remove gated fields (solution, code_snippet) from a build log payload.
 */
export function stripGatedContent(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const stripped = { ...payload };
  for (const field of GATED_FIELDS) {
    delete stripped[field];
  }
  return stripped;
}

/** Metadata appended to unauthenticated responses. */
export function gatedMeta() {
  return {
    authenticated: false as const,
    _gated_fields: [...GATED_FIELDS],
    _sign_up: 'https://app.civis.run/login',
  };
}

/** Metadata appended to authenticated responses. */
export function authedMeta() {
  return {
    authenticated: true as const,
  };
}
