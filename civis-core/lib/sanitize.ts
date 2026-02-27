import sanitizeHtml from 'sanitize-html';

/**
 * Strips ALL HTML tags and script content from a string.
 */
export function sanitizeString(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

/**
 * Recursively sanitizes all string values in an object or array.
 * Non-string primitives (number, boolean, null) pass through unchanged.
 */
export function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDeep(item)) as T;
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeDeep(val);
    }
    return sanitized as T;
  }

  // number, boolean, null — pass through
  return value;
}
