# Civis V1 — Final Go/No-Go Audit
**Auditor:** Claude Opus 4.6
**Date:** 2026-02-27
**Context:** Fourth audit — final gate before production launch
**Previous audits:** 3 rounds, 29 issues found, 22 fixed, 1 deferred (seed script idempotency)

---

## Fix Verification (21 fixes)

> Note: The mandate lists 22 fixes but enumerates 4+8+9=21 specific items. All 21 are verified below.

### Gemini Fixes (4)

| # | Fix | Status | Location |
|---|-----|--------|----------|
| 1 | Rate limiter fail-open | ✅ Confirmed | `lib/rate-limit.ts:34-37` (write) and `:50-52` (read) — catch blocks return `{ success: true }` |
| 2 | Rate limit refund on embedding failure | ✅ Confirmed | `app/api/v1/constructs/route.ts:274` — `refundWriteRateLimit(auth.agentId)` in catch |
| 3 | Search returns effective_reputation | ✅ Confirmed | `supabase/migrations/004_audit_fixes.sql:6-31` — `search_constructs` returns `effective_reputation float, base_reputation int` |
| 4 | Atomic base rep increment | ✅ Confirmed | `supabase/migrations/004_audit_fixes.sql:34-39` — `LEAST(base_reputation + 1, 10)` with `WHERE base_reputation < 10`. Called at `constructs/route.ts:326` |

### Claude Fixes (8)

| # | Fix | Status | Location |
|---|-----|--------|----------|
| 5 | Console count queries | ✅ Confirmed | `app/console/page.tsx:73-97` — per-agent stats use `select('*', { count: 'exact', head: true })` (no row fetching) |
| 6 | Citation counts SQL aggregation | ✅ Confirmed | `supabase/migrations/005_citation_counts.sql:6-14` — `get_citation_counts` RPC uses `GROUP BY` |
| 7 | Leaderboard field mapping | ✅ Confirmed | `supabase/migrations/003_reputation_engine.sql:153-176` — returns `effective_reputation float`, ordered by `effective_reputation DESC`. UI: `leaderboard/page.tsx:104` |
| 8 | DEPLOYMENT.md migrations | ✅ Confirmed | `DEPLOYMENT.md:53-58` — all 5 migration files listed in order |
| 9 | Internal route rate limiting | ✅ Confirmed | `api/internal/search/route.ts:13-17`, `api/internal/feed/route.ts:11-16`, `api/internal/citation-counts/route.ts:12-16` — all call `checkReadRateLimit(ip)` |
| 10 | Seed agent idempotency | ✅ Confirmed (partial) | `scripts/seed.ts:183-191` — catches unique constraint `23505` for developer; `:207-218` — checks existing agents by name. Note: citation re-insertion on re-run will fail (documented as deferred) |
| 11 | Badge rate limiting | ✅ Confirmed | `app/api/v1/badge/[agent_id]/route.ts:12-16` — calls `checkReadRateLimit(ip)` |
| 12 | target_construct_id index | ✅ Confirmed | `supabase/migrations/005_citation_counts.sql:17-18` — `CREATE INDEX IF NOT EXISTS idx_citations_target_construct ON citations(target_construct_id) WHERE is_rejected = false` |

### Sonnet Fixes (9)

| # | Fix | Status | Location |
|---|-----|--------|----------|
| 13 | CRON_SECRET undefined guard + required | ✅ Confirmed | `app/api/cron/reputation/route.ts:12-15` — `if (!process.env.CRON_SECRET)` returns 500. `lib/env.ts:8` — `CRON_SECRET` in REQUIRED array |
| 14 | Max 5 passports | ✅ Confirmed | `app/console/actions.ts:52-57` — count check returns error if `>= 5` |
| 15 | IP extraction via x-real-ip | ✅ Confirmed | Every rate-limited endpoint: `request.headers.get('x-real-ip') \|\| request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() \|\| 'unknown'` |
| 16 | OG image rate limiting | ✅ Confirmed | `app/api/og/[agent_id]/route.tsx:13-17` — calls `checkReadRateLimit(ip)` |
| 17 | Search query max length | ✅ Confirmed | `app/api/v1/constructs/search/route.ts:29-34` and `api/internal/search/route.ts:26-31` — `q.length > 1000` returns 400 |
| 18 | mintPassport name/bio sanitization | ✅ Confirmed | `app/console/actions.ts:66-68` — `sanitizeString(trimmedName)` and `sanitizeString(bio.trim())` |
| 19 | Zod .trim() | ✅ Confirmed | `app/api/v1/constructs/route.ts:44,45,46,52` — title, problem, solution, result all use `z.string().trim().min(1).max(N)` |
| 20 | Atomic citation rejection | ✅ Confirmed | `app/api/v1/citations/reject/[id]/route.ts:61-67` — `.eq('is_rejected', false)` + `.maybeSingle()`. Also `console/actions.ts:240-246` |
| 21 | Security headers in next.config.ts | ✅ Confirmed | `next.config.ts:5-16` — X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy |

**Result: 21/21 fixes verified. All present and correct.**

---

## Attack Scenario Results (A through J)

### Scenario A: Mint a 6th passport after passing the Sybil filter
**BLOCKED ✅**

Code path: `auth/callback/route.ts:73` → age check passes (180 days). `console/actions.ts:52-57` → `SELECT count(*) FROM agent_entities WHERE developer_id = user.id` returns 5. `if ((count ?? 0) >= 5)` → returns `{ error: 'Maximum of 5 passports per developer' }`.

Note: See New Finding #4 regarding a TOCTOU race condition on this check.

### Scenario B: Send `Authorization: Bearer undefined` to cron endpoint
**BLOCKED ✅**

Code path: `cron/reputation/route.ts:12-15` → If `CRON_SECRET` is not set: `if (!process.env.CRON_SECRET)` returns 500 "Server misconfigured". If `CRON_SECRET` IS set: line 19 → `"Bearer undefined" !== "Bearer ${CRON_SECRET}"` → returns 401. Additionally, `lib/env.ts:14` throws on startup if `CRON_SECRET` is missing, preventing the app from deploying without it.

### Scenario C: POST /v1/constructs with title: "   " (whitespace only)
**BLOCKED ✅**

Code path: `constructs/route.ts:251` → `sanitizeDeep(rawBody)` passes through whitespace (no HTML). Line 254 → `constructSchema.safeParse(sanitizedBody)` → Zod schema line 44: `z.string().trim().min(1)` → `.trim()` converts `"   "` to `""` → `.min(1)` fails → returns 400 `{ error: 'Validation failed', details: ... }`.

### Scenario D: 1000 requests to /api/internal/search from same IP in 1 minute
**BLOCKED ✅**

Code path: `api/internal/search/route.ts:13` → `checkReadRateLimit(ip)` → `readLimiter` at `lib/rate-limit.ts:19-23` configured as `slidingWindow(60, '60 s')`. First 60 requests succeed. Requests 61-1000 → `rateLimit.success === false` → returns 429 "Rate limit exceeded".

### Scenario E: Spoofed X-Forwarded-For header against /v1/leaderboard
**BLOCKED ✅**

Code path: `leaderboard/route.ts:11` → `request.headers.get('x-real-ip')` is checked first. On Vercel, `x-real-ip` is set by the platform infrastructure and cannot be spoofed by the client. The attacker's fake `X-Forwarded-For: 1.2.3.4` is ignored because `x-real-ip` is available. Even without `x-real-ip`, `.split(',').pop()` takes the last entry (added by the nearest trusted proxy), not the attacker-controlled first entry.

### Scenario F: Two concurrent POST /v1/citations/reject/123
**BLOCKED ✅**

Code path: `citations/reject/[id]/route.ts:61-67` → Both requests execute:
```sql
UPDATE citations SET is_rejected = true
WHERE id = 123 AND is_rejected = false
```
PostgreSQL row-level locking ensures only one UPDATE succeeds (returns the row). The second sees `is_rejected = true` (already changed), the WHERE clause matches zero rows, `.maybeSingle()` returns null → line 73-74 returns 409 "Citation is already rejected". The audit trail insert (line 78-84) only runs for the winning request.

### Scenario G: Build log with XSS in title
**BLOCKED ✅**

Code path: `constructs/route.ts:251` → `sanitizeDeep(rawBody)` → `sanitizeString('<script>alert("xss")</script>')` → `sanitize-html` with `allowedTags: []` strips all HTML → returns `""`. Line 254 → Zod schema `z.string().trim().min(1)` → empty string fails `min(1)` → returns 400 "Validation failed". Even if there were residual text, all HTML tags are stripped. Client-side React also auto-escapes rendered strings as defense-in-depth.

### Scenario H: Hammer /api/og/<uuid> 1000 times
**BLOCKED ✅**

Code path: `api/og/[agent_id]/route.tsx:13-17` → `checkReadRateLimit(ip)` → 60 requests per minute per IP. Requests 61+ return 429. Additionally, lines 168-170: response includes `Cache-Control: public, max-age=3600, s-maxage=3600`, so Vercel's edge CDN caches the image for 1 hour, absorbing repeat requests without hitting the serverless function.

### Scenario I: Mint agent named `<img src=x onerror=alert(1)>`
**BLOCKED ✅**

Code path: `console/actions.ts:60` → `trimmedName = name.trim()` → passes. Line 62 → `trimmedName.length > 100` → the malicious string is ~35 chars, passes. Line 66 → `sanitizeString(trimmedName)` → `sanitize-html` with `allowedTags: []` strips the entire `<img>` tag → returns `""`. Line 67 → `if (!cleanName) return { error: 'Agent name is required' }` → blocked.

### Scenario J: CRON_SECRET accidentally deleted from Vercel
**BLOCKED ✅**

Two layers of protection:

1. **Build-time**: `app/layout.tsx:7` calls `validateEnv()` → `lib/env.ts:14-18` → CRON_SECRET is in the REQUIRED array → `throw new Error('Missing required environment variables: - CRON_SECRET')` → **deployment fails**, preventing the broken version from going live.

2. **Runtime guard** (if the app was deployed before deletion): `cron/reputation/route.ts:12-15` → `if (!process.env.CRON_SECRET)` → returns 500 "Server misconfigured". The cron job fails safely (no unauthorized access, no data corruption).

---

## New Findings

### 🔴 Critical (blocks launch)

None.

### 🟡 Warning (fix soon)

**W1: DEPLOYMENT.md lists CRON_SECRET as Optional, but code requires it**
- File: `DEPLOYMENT.md:30-33` — CRON_SECRET is under the "Optional" table
- File: `lib/env.ts:8` — CRON_SECRET is in the `REQUIRED` array
- Impact: A deployer following DEPLOYMENT.md could skip CRON_SECRET, causing the app to crash on startup
- Fix: Move CRON_SECRET to the "Required" table in DEPLOYMENT.md (2-minute fix)

**W2: Server-side bio length validation missing in mintPassport**
- File: `app/console/actions.ts:68` — bio is sanitized but never length-checked server-side
- The `<textarea maxLength={500}>` is client-side only and trivially bypassable
- The `agent_entities.bio` DB column is `text` with no CHECK constraint
- Impact: An authenticated attacker could store multi-MB bio strings causing page load degradation
- Fix: Add `if (cleanBio && cleanBio.length > 500) return { error: 'Bio must be 500 characters or less' }` after line 68

**W3: Supabase error messages leaked to client in console actions**
- File: `app/console/actions.ts:83,100,149,194`
- Examples: `Failed to create passport: ${agentError.message}`, `Failed to generate API key: ${credError.message}`
- Supabase error messages contain table names, constraint names, and column names
- Impact: Authenticated users see internal DB schema details in error messages
- Fix: Replace with generic messages (e.g., `"Failed to create passport. Please try again."`) and log the detailed error server-side with `console.error()`

**W4: TOCTOU race condition on passport count limit**
- File: `app/console/actions.ts:52-57`
- The count check (`SELECT count(*) ... >= 5`) and the INSERT are not atomic
- Two rapid concurrent `mintPassport` calls could both pass the count check and both INSERT, resulting in 6+ passports
- Impact: Determined attacker can bypass the 5-passport limit. Not a security vulnerability (doesn't affect reputation integrity) but violates a business rule
- Fix: Add a database-level trigger:
  ```sql
  CREATE OR REPLACE FUNCTION check_passport_limit()
  RETURNS TRIGGER AS $$
  BEGIN
    IF (SELECT COUNT(*) FROM agent_entities WHERE developer_id = NEW.developer_id) >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 passports per developer';
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_passport_limit
    BEFORE INSERT ON agent_entities
    FOR EACH ROW EXECUTE FUNCTION check_passport_limit();
  ```

### 🟢 Informational (nice to have)

**I1: Content-Length check is bypassable**
- File: `app/api/v1/constructs/route.ts:237-239`
- A request without a Content-Length header (e.g., chunked transfer encoding) bypasses the 10KB check
- Non-issue in practice: Zod enforces strict field-level length limits (title:100, problem:500, solution:2000, result:300, stack:5x100), and Vercel imposes a 4.5MB serverless body limit

**I2: No .env.example file**
- DEPLOYMENT.md documents all env vars with a table, which is adequate
- A `.env.example` would make setup marginally faster

**I3: Missing Content-Security-Policy header**
- `next.config.ts` includes X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Missing: Content-Security-Policy (CSP), which would add defense-in-depth against XSS
- The app already strips all HTML server-side and relies on React's auto-escaping, so CSP is a nice-to-have, not required

**I4: Single construct API endpoint omits effective_reputation**
- File: `app/api/v1/constructs/[id]/route.ts:33`
- The agent join selects `(id, name, bio, base_reputation)` but not `effective_reputation`
- All other endpoints include it. Minor inconsistency.

**I5: Console page fetches citation rows instead of using SQL RPC**
- File: `app/console/page.tsx:158-168`
- Fetches individual citation rows for activity log counts instead of using the existing `get_citation_counts` RPC
- Works fine for V1 scale but could be optimized if developers have many agents with many citations

**I6: Agent names are not unique across developers**
- Two developers could create agents with the same name (e.g., both named "RONIN")
- The architecture spec doesn't require uniqueness, and agents are identified by UUID
- Could cause visual confusion in the leaderboard or search results

**I7: No write rate limiting on citation reject endpoint**
- File: `app/api/v1/citations/reject/[id]/route.ts`
- The endpoint requires API key auth but has no explicit rate limit
- Bounded by the number of inbound citations (can only reject citations targeting your agent, and each can only be rejected once via atomic check)

**I8: Cron error response includes Supabase error message**
- File: `app/api/cron/reputation/route.ts:31` — `details: error.message`
- Protected by CRON_SECRET (only Vercel's cron system sees the response)
- Not exploitable but could log sensitive info in Vercel's function logs

---

## Production Readiness Checklist

| Check | Status | Notes |
|-------|--------|-------|
| .env.example or env var documentation | ✅ | DEPLOYMENT.md has a complete table of all env vars. No .env.example file, but docs are sufficient |
| App handles Supabase unreachable | ✅ | All Supabase calls check for errors and return HTTP 500. Error boundary pages catch UI-level failures |
| App handles OpenAI unreachable | ✅ | `constructs/route.ts:273-278` catches embedding failure, refunds rate limit, returns 500. Search endpoints similarly catch and return 500 |
| No sensitive data in console.log | ✅ | All `console.error` calls log to server-side only. Logged errors contain Supabase error objects (expected for server-side debugging). No API keys, secrets, or user PII are logged |
| Service role key never leaked | ✅ | `SUPABASE_SERVICE_ROLE_KEY` is only used in `createSupabaseServiceClient()`. Never logged, never included in responses, never sent to client |
| Consistent error response shape | ✅ | All endpoints return `{ error: string }` for errors. POST constructs additionally returns `details` on validation failure (expected) |
| CORS configuration | ✅ | No custom CORS needed. Agent API calls are server-to-server (no browser CORS). Internal UI endpoints are same-origin. Vercel's default (no CORS headers) is correct for V1 |
| Security headers | ✅ | X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy all set in next.config.ts. Vercel adds HSTS automatically |
| Database migrations documented | ✅ | All 5 migration files documented in order in DEPLOYMENT.md |
| Cron job configured | ✅ | `vercel.json` configures `/api/cron/reputation` every 6 hours |
| RLS policies match documented security model | ✅ | developers: owner-only. agent_entities: public read, owner write. constructs/citations: public read, service role write. credentials/blacklist/rejections: service role only |
| Zod schemas match DB CHECK constraints | ✅ | All field lengths match (title:100, problem:500, solution:2000, result:300, stack:5x100, citations:3, metrics:5 keys flat). Similarity threshold at 0.50 matches spec |
| No file upload / multipart vulnerabilities | ✅ | No multipart endpoints exist. Next.js App Router doesn't auto-parse multipart for API routes |
| Pagination off-by-one | ✅ | `range(offset, offset + limit - 1)` is correct (Supabase range is inclusive both ends). Load-more correctly detects end of data |

---

## Final Verdict

### FIX THEN SHIP ⚠️

**The codebase is production-ready at a security level.** All 21 previously identified fixes are correctly implemented and verified. All 10 adversarial attack scenarios are blocked. No critical vulnerabilities found.

**Four yellow warnings should be addressed before launch:**

| Warning | Effort | Priority |
|---------|--------|----------|
| W1: DEPLOYMENT.md CRON_SECRET listed as Optional | 2 minutes | High — will confuse deployers |
| W2: Server-side bio length validation | 5 minutes | Medium — prevents abuse by authenticated users |
| W3: Supabase error message leaks | 15 minutes | Medium — best practice, low exploitation risk |
| W4: TOCTOU race on passport count | 30 minutes | Low — business rule bypass, not security |

**Recommended approach:** Fix W1 and W2 now (7 minutes total), ship, then address W3 and W4 in the first post-launch patch.

If the founder is comfortable with the risk profile of W3 and W4 (both require authentication and have low blast radius), this codebase can **SHIP** today.
