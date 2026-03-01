# Plan: Replace `bad-words` with `obscenity` in Passport Minting

**Status:** COMPLETE
**Created:** 2026-03-01
**Affects:** 3 files total (actions.ts, package.json, CHANGELOG.md)

---

## Context

Gemini added `bad-words@4.0.0` to the agent passport minting flow as a profanity filter on agent names and bios. Code review found:
- Package is unmaintained (83 open issues, single maintainer gone dark since Aug 2024)
- Default word list is overly aggressive for a developer platform (blocks "god", "hell", "damn", "sex" — an agent named "GodMode" gets rejected)
- Compiles ~800 RegExp objects per call without short-circuiting (uses `.filter().length > 0` instead of `.some()`)
- Zero leetspeak or unicode handling — `f u c k` and `fvck` pass right through
- `@types/bad-words@3` installed in devDeps for a `bad-words@4` runtime package (version drift — v4 is a TS rewrite that ships its own types)
- The `Filter` is instantiated inside the server action on every call instead of being hoisted to module scope

**Replacement:** `obscenity@0.4.6`
- Actively maintained (last push Feb 26, 2026)
- Zero runtime dependencies
- Ships its own TypeScript types (no `@types/` needed)
- Built-in Scunthorpe false-positive whitelists ("assessment", "grapes", "the pen is" etc. don't trigger)
- Catches leetspeak (`f u c k`, `fuuuck`), unicode homoglyphs, and character insertion out of the box
- `hasMatch(string)` returns boolean, fully synchronous — drop-in behavioral replacement for `isProfane(string)`

---

## Files That Will Be Modified

1. **`civis-core/package.json`** — swap deps (via npm uninstall/install commands)
2. **`civis-core/app/feed/console/actions.ts`** — rewrite filter import + usage (5 line changes)
3. **`CHANGELOG.md`** — add 0.8.4 entry

**Files that will NOT be modified (confirmed no changes needed):**
- `lib/sanitize.ts` — XSS sanitization is separate from profanity filtering
- `app/feed/console/page.tsx` — frontend already handles `{ error: string }` returns
- No other server actions or API routes use the profanity filter

---

## Step-by-Step Implementation

### Step 1: Uninstall `bad-words` and `@types/bad-words`

- [x] Run: `cd c:/dev/civis/civis-core && npm uninstall bad-words @types/bad-words`
- [x] Verify `package.json` no longer contains `bad-words` in `dependencies` or `@types/bad-words` in `devDependencies`

### Step 2: Install `obscenity`

- [x] Run: `cd c:/dev/civis/civis-core && npm install obscenity`
- [x] Verify `package.json` now contains `"obscenity"` in `dependencies`

### Step 3: Rewrite the profanity filter in `actions.ts`

**File:** `civis-core/app/feed/console/actions.ts`

#### 3a: Replace the import (line 10)

- [x] **Remove:** `import { Filter } from 'bad-words';`
- [x] **Add:** `import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';`

#### 3b: Add module-scope singleton matcher

- [x] Add between the imports and the `// Types` comment block (after line 10, before line 12):

```ts
const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});
```

**Why module-scope:** The matcher is stateless and identical every invocation. Hoisting to module scope means it's constructed once when the module loads, then reused across all Server Action calls within the same serverless invocation. No memory leak — it's a fixed-size compiled matcher.

#### 3c: Remove the per-call `new Filter()` instantiation (line 71)

- [x] **Remove:** `const filter = new Filter();`

#### 3d: Replace the name profanity check (line 73)

- [x] **Change:** `if (filter.isProfane(cleanName)) {`
- [x] **To:** `if (profanityMatcher.hasMatch(cleanName)) {`
- [x] Error message on line 74 stays identical: `return { error: 'Agent name contains inappropriate language.' };`

#### 3e: Replace the bio profanity check (line 81)

- [x] **Change:** `if (cleanBio && filter.isProfane(cleanBio)) {`
- [x] **To:** `if (cleanBio && profanityMatcher.hasMatch(cleanBio)) {`
- [x] Error message on line 82 stays identical: `return { error: 'Agent bio contains inappropriate language.' };`

#### 3f: Verify nothing else changed

- [x] All other code in the file (auth checks, Supabase queries, API key generation) remains untouched
- [x] The `MintResult`, `GenerateKeyResult`, `RevokeResult`, `RejectCitationResult` types are unchanged
- [x] The `revokeCredential`, `generateNewKey`, `rejectCitation` functions are unchanged

### Step 4: Update CHANGELOG.md

**File:** `CHANGELOG.md` (at repo root `c:/dev/civis/CHANGELOG.md`)

- [x] Update `Current Version` line from `0.8.3` to `0.8.4`
- [x] Add new entry at the top (before the existing `[0.8.3]` section):

```markdown
## [0.8.4] — 2026-03-01

### Changed
- **Profanity filter:** Replaced unmaintained `bad-words` package with `obscenity`. Fixes overly aggressive false positives (e.g. "GodMode", "assessment" no longer blocked), adds leetspeak and unicode homoglyph detection, and hoists the matcher to module scope for better performance. Affects `mintPassport` server action only.

### Removed
- `bad-words` and `@types/bad-words` dependencies.

---
```

### Step 5: Build verification

- [x] Run: `cd c:/dev/civis/civis-core && npx tsc --noEmit` — must pass with zero type errors
- [x] Run: `cd c:/dev/civis/civis-core && npm run build` — must complete successfully

---

## Expected Final State of `actions.ts` (top ~84 lines)

```ts
'use server';

import crypto from 'crypto';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeString } from '@/lib/sanitize';
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// =============================================
// Types
// =============================================

export type MintResult = {
  apiKey?: string;
  agentName?: string;
  error?: string;
};

export type GenerateKeyResult = {
  apiKey?: string;
  agentName?: string;
  error?: string;
};

export type RevokeResult = {
  error?: string;
};

export type RejectCitationResult = {
  error?: string;
};

// =============================================
// MINT PASSPORT
// Creates agent_entity + generates first API key
// =============================================

export async function mintPassport(
  name: string,
  bio: string | null
): Promise<MintResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Check max passports per developer
  const { count } = await supabase
    .from('agent_entities')
    .select('*', { count: 'exact', head: true })
    .eq('developer_id', user.id);
  if ((count ?? 0) >= 5) {
    return { error: 'Maximum of 5 passports per developer' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) return { error: 'Agent name is required' };
  if (trimmedName.length > 100)
    return { error: 'Agent name must be 100 characters or less' };

  // Sanitize name and bio to strip HTML
  const cleanName = sanitizeString(trimmedName);
  if (!cleanName) return { error: 'Agent name is required' };
  const cleanBio = bio ? sanitizeString(bio.trim()) : null;

  if (profanityMatcher.hasMatch(cleanName)) {
    return { error: 'Agent name contains inappropriate language.' };
  }

  if (cleanBio && cleanBio.length > 500) {
    return { error: 'Bio must be 500 characters or less' };
  }

  if (cleanBio && profanityMatcher.hasMatch(cleanBio)) {
    return { error: 'Agent bio contains inappropriate language.' };
  }

  // ... rest of function unchanged (duplicate check, insert, key gen, return) ...
}

// ... rest of file unchanged (revokeCredential, generateNewKey, rejectCitation) ...
```

---

## Rollback

If anything goes wrong:
```bash
cd c:/dev/civis/civis-core
npm uninstall obscenity
npm install bad-words @types/bad-words
```
Then revert the `actions.ts` edits via `git checkout -- app/feed/console/actions.ts`.

---

## Summary of What Improves

| Issue | Before (`bad-words`) | After (`obscenity`) |
|---|---|---|
| Maintenance | Unmaintained, 83 open issues | Active, last push 3 days ago |
| False positives | Blocks "GodMode", "SexTech", "damn good" | Built-in Scunthorpe whitelists |
| Bypass resistance | Zero — leetspeak/unicode passes through | Catches `f u c k`, `fuuuck`, homoglyphs |
| Performance | ~800 RegExp per call, new instance per call | Single compiled matcher at module scope |
| Dependencies | 1 transitive dep (`badwords-list`) | Zero dependencies |
| Type safety | `@types/bad-words@3` for v4 package | Ships own TypeScript types |
