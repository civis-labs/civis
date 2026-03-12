import { findByName, findByAlias, getAllTokens, type StackEntry } from './stack-taxonomy';

/**
 * Result of normalizing a single stack input string.
 */
export type NormalizeResult =
  | { status: 'matched'; canonical: string; category: string }
  | { status: 'rejected'; input: string; suggestions: string[] };

/**
 * Normalize a single stack input to its canonical name.
 *
 * Matching order:
 * 1. Exact canonical name match (case-insensitive)
 * 2. Exact alias match (case-insensitive)
 * 3. Fuzzy match via Levenshtein distance (threshold: <=3 edits for inputs >=4 chars, <=1 for shorter)
 *
 * Returns the canonical name if matched, or suggestions if rejected.
 */
export function normalizeStackItem(input: string): NormalizeResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { status: 'rejected', input: trimmed, suggestions: [] };
  }

  // 1. Exact canonical name match
  const byName = findByName(trimmed);
  if (byName) {
    return { status: 'matched', canonical: byName.name, category: byName.category };
  }

  // 2. Exact alias match
  const byAlias = findByAlias(trimmed);
  if (byAlias) {
    return { status: 'matched', canonical: byAlias.name, category: byAlias.category };
  }

  // 3. Fuzzy match
  const lowerInput = trimmed.toLowerCase();
  const maxDistance = lowerInput.length >= 4 ? 3 : 1;
  const candidates: { entry: StackEntry; distance: number }[] = [];

  for (const { token, entry } of getAllTokens()) {
    // Skip tokens that are wildly different in length (optimization)
    if (Math.abs(token.length - lowerInput.length) > maxDistance) continue;

    const dist = levenshtein(lowerInput, token);
    if (dist <= maxDistance && dist > 0) {
      // Avoid duplicate entries in candidates
      const existing = candidates.find(c => c.entry.name === entry.name);
      if (!existing || dist < existing.distance) {
        if (existing) {
          existing.distance = dist;
        } else {
          candidates.push({ entry, distance: dist });
        }
      }
    }
  }

  // Sort by distance, then alphabetically
  candidates.sort((a, b) => a.distance - b.distance || a.entry.name.localeCompare(b.entry.name));

  // If the best match is distance 1, auto-resolve (very likely a typo)
  if (candidates.length > 0 && candidates[0].distance <= 1) {
    return {
      status: 'matched',
      canonical: candidates[0].entry.name,
      category: candidates[0].entry.category,
    };
  }

  // Distance 2-3: suggest but reject (could be ambiguous)
  const suggestions = candidates.slice(0, 3).map(c => c.entry.name);

  return { status: 'rejected', input: trimmed, suggestions };
}

/**
 * Normalize an entire stack array. Returns all-or-nothing:
 * either every item resolves to a canonical name, or an error with details per item.
 */
type RejectedResult = Extract<NormalizeResult, { status: 'rejected' }>;

export function normalizeStack(
  stack: string[]
): { status: 'ok'; normalized: string[] } | { status: 'error'; errors: RejectedResult[] } {
  const results = stack.map(normalizeStackItem);
  const errors = results.filter((r): r is RejectedResult => r.status === 'rejected');

  if (errors.length > 0) {
    return { status: 'error', errors };
  }

  const normalized = results.map(r => {
    if (r.status === 'matched') return r.canonical;
    return ''; // unreachable, but satisfies TS
  });

  // Deduplicate (two different inputs might resolve to the same canonical name)
  const unique = [...new Set(normalized)];

  return { status: 'ok', normalized: unique };
}

/**
 * Levenshtein edit distance between two strings.
 * Uses the standard dynamic programming approach with a single-row optimization.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure a is the shorter string for the single-row optimization
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const aLen = a.length;
  const bLen = b.length;

  // Previous row of distances
  const prev = new Array<number>(aLen + 1);
  for (let i = 0; i <= aLen; i++) prev[i] = i;

  for (let j = 1; j <= bLen; j++) {
    let prevDiag = prev[0];
    prev[0] = j;

    for (let i = 1; i <= aLen; i++) {
      const temp = prev[i];
      if (a[i - 1] === b[j - 1]) {
        prev[i] = prevDiag;
      } else {
        prev[i] = 1 + Math.min(prevDiag, prev[i], prev[i - 1]);
      }
      prevDiag = temp;
    }
  }

  return prev[aLen];
}
