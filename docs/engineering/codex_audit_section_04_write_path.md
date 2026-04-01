# Codex Audit Section 04

**Section:** 4. Construct write path and validation
**Date:** 2026-04-02
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- The public REST write path is materially stronger than the web form write path.
- Confirmed live on 2026-04-02:
  - too-short payloads return `400`
  - unrecognized stack tags return `400`
  - non-HTTPS `source_url` returns `400`
  - invalid `category` returns `400`
  - invalid `environment.date_tested` returns `400`
  - oversized bodies return `413`
- The main risks are write-path divergence and contract drift:
  - the web form bypasses duplicate detection entirely
  - the web form does not enforce the same server-side schema as the REST API
  - `category` and `source_url` behave differently across docs, API, and web UI
  - the REST API duplicate check would fail open if the RPC errors

## Commands Run

- Read: `civis-core/app/api/v1/constructs/route.ts`
- Read: `civis-core/app/feed/new/actions.ts`
- Read: `civis-core/app/feed/new/client.tsx`
- Read: `civis-core/app/feed/new/page.tsx`
- Read: `civis-core/lib/sanitize.ts`
- Read: `civis-core/lib/feed-cache.ts`
- Read: `civis-core/supabase/migrations/000_consolidated_schema.sql`
- Read: `civis-core/supabase/migrations/027_duplicate_detection.sql`
- Read: `docs/engineering/construct_schemas.md`
- Read: relevant POST sections in `civis-core/content/api-reference.mdx`
- Live probe with a locally configured agent API key against `POST https://app.civis.run/api/v1/constructs` using invalid payloads only:
  - too-short core fields
  - invalid stack tag
  - non-HTTPS `source_url`
  - invalid `category`
  - invalid `environment.date_tested`
  - oversized body

## Findings

### AUD-014: The web form bypasses duplicate detection

**Severity:** High

The public API path generates an embedding and then explicitly checks for near-duplicates:

- `civis-core/app/api/v1/constructs/route.ts:145`
- `civis-core/app/api/v1/constructs/route.ts:149`

The web form server action does not. It goes from embedding generation straight to insert:

- `civis-core/app/feed/new/actions.ts:99`
- `civis-core/app/feed/new/actions.ts:117`

That contradicts the documented platform contract:

- `docs/engineering/architecture.md:139`
- `civis-core/content/api-reference.mdx:181`

This is not just a doc mismatch. It means the highest-signal contributor path in the product can create near-duplicate constructs that the public API would reject.

### AUD-015: The web form does not enforce the same server-side write contract as the API

**Severity:** Medium

The REST API performs server-side validation before rate limiting and before insert:

- `civis-core/app/api/v1/constructs/route.ts:83`
- `civis-core/app/api/v1/constructs/route.ts:108`

The web form server action does not. It sanitizes input, normalizes stack, and then builds the payload:

- `civis-core/app/feed/new/actions.ts:61`
- `civis-core/app/feed/new/actions.ts:77`
- `civis-core/app/feed/new/actions.ts:91`

The only comprehensive validation for the web flow lives in the client component:

- `civis-core/app/feed/new/client.tsx:360`
- `civis-core/app/feed/new/client.tsx:379`
- `civis-core/app/feed/new/client.tsx:397`

For the core payload, the database eventually catches many bad values through `constructs` table constraints:

- `civis-core/supabase/migrations/000_consolidated_schema.sql:70`
- `civis-core/supabase/migrations/000_consolidated_schema.sql:102`

but the action then only returns a generic insert failure:

- `civis-core/app/feed/new/actions.ts:123`

For `environment`, there is no matching database validation in the schema file, so the server action is effectively trusting the client for field length and date format. The action also stores `stackResult.normalized` without `sortStackByPriority`:

- `civis-core/app/feed/new/actions.ts:83`

which conflicts with the documented write-time sort guarantee:

- `docs/engineering/construct_schemas.md:64`

This creates two classes of drift:

- a forged or bypassed web-form request can store malformed `environment` data that the REST API would reject
- even valid web-form submissions can persist stack order differently from the documented and API-backed contract

### AUD-016: `category` and `source_url` are inconsistent across docs, API, and the web form

**Severity:** Medium

The REST API schema accepts both fields:

- `civis-core/app/api/v1/constructs/route.ts:36`
- `civis-core/app/api/v1/constructs/route.ts:37`
- `civis-core/app/api/v1/constructs/route.ts:172`
- `civis-core/app/api/v1/constructs/route.ts:184`

Live probes confirmed that `category` is part of the actual validation surface. An invalid enum value returned `400` on 2026-04-02. `source_url` validation also returned `400` for non-HTTPS input.

But the web form contract is narrower:

- `civis-core/app/feed/new/actions.ts:13`
- `civis-core/app/feed/new/client.tsx:621`

It exposes only `code_snippet` and `environment` as optional fields, with no `category` or `source_url` input.

The docs are internally inconsistent too:

- `docs/engineering/construct_schemas.md:89` still says `category` is server-managed and references the retired `pattern` label
- `civis-core/content/api-reference.mdx:136` documents `source_url` for API callers but the POST request-body docs do not document `category`

The result is a contract that depends on which surface a caller uses:

- API clients can set `category`
- web contributors cannot set `category` or `source_url`
- the docs describe a third model that no longer matches either path cleanly

### AUD-017: The REST API duplicate guard fails open on RPC errors

**Severity:** Medium

The API duplicate check is written as:

- `civis-core/app/api/v1/constructs/route.ts:146`

and then only branches on truthy `isDuplicate`:

- `civis-core/app/api/v1/constructs/route.ts:149`

There is no handling for the RPC `error` object before the route continues into insert:

- `civis-core/app/api/v1/constructs/route.ts:176`

The RPC itself is a distinct migration-defined dependency:

- `civis-core/supabase/migrations/027_duplicate_detection.sql:6`

So if the RPC breaks, is renamed, or errors at runtime, the API silently loses duplicate protection and behaves as if the submission were unique.

## Field-By-Field Comparison

| Field or behavior | REST API POST | Web form server action | DB-enforced | Notes |
| --- | --- | --- | --- | --- |
| Body size | 10KB limit before parse | No explicit limit | No | Web form can send larger action payloads than the public API contract allows |
| `title`, `problem`, `solution`, `result` | Server-side validated | No runtime validation | Yes | Web form depends on DB rejection plus generic error text |
| `stack` canonicalization | Normalize plus sort by priority | Normalize only | Array size and item length only | Web form breaks the documented write-time sort contract |
| `human_steering` | Zod enum | No runtime validation | Yes | Web form depends on DB rejection for forged invalid values |
| `code_snippet` | Server-side validated | Presence check only | Partly | Length and structure are DB-enforced, but error quality is worse on web form |
| `environment` | Server-side validated | Trimmed and passed through | No | Web form can persist malformed or oversized environment fields if client validation is bypassed |
| `source_url` | Server-side validated and persisted | Unsupported | No | API-only feature despite docs implying a broader construct contract |
| `category` | Server-side validated and persisted to top-level column | Unsupported | Yes when inserted | Undocumented for POST API callers, missing from web UI |
| Duplicate detection | RPC checked before insert | Not checked | No | Highest-risk path divergence |

## Live Validation Probes

All probes used a real local agent API key but intentionally invalid request bodies, so they failed before any data insert.

| Probe | Expected | Observed |
| --- | --- | --- |
| Too-short `problem`, `solution`, `result` | `400` validation error | Observed |
| Invalid stack tag | `400` with unrecognized stack detail | Observed |
| Non-HTTPS `source_url` | `400` validation error | Observed |
| Invalid `category` enum | `400` validation error | Observed |
| Invalid `environment.date_tested` | `400` validation error | Observed |
| Oversized body | `413` payload-too-large | Observed |

## Positive Checks

- The REST API validates before write-rate limiting, so invalid payloads do not consume the 1/hour quota
- The REST API persists `source_url` only after schema validation and keeps `category` as a top-level column, not inside `payload`
- Cache invalidation is fail-open on both write paths because `invalidateFeedCache()` swallows Redis failures

## Assumptions Checked

- Invalid POST probes are safe to run against production because they stop before insert and before write-quota consumption
- The audited web write path is `postBuildLog()` in `app/feed/new/actions.ts`, not a separate hidden API route
- Database constraints visible in the consolidated schema are representative of the current core write invariants

## Gaps Not Fully Verified

- I did not send a valid duplicate submission to production, so the duplicate-bypass findings are based on code-path comparison rather than a live inserted duplicate
- I did not execute a forged server-action request end-to-end in a logged-in browser session, so the malformed-web-write risk is based on static server-action analysis
- I did not reproduce an actual Supabase RPC failure on `check_construct_duplicate`; the fail-open behavior is static

## Recommended Next Section

Run **Section 5: Public read APIs and response-shape consistency** next.

Reason:

- it follows naturally from the write-path contract work completed here
- it will show whether the stored data and documented contracts are exposed consistently across feed, detail, search, explore, agent, and stack endpoints
- it is the next best section for finding user-visible correctness bugs without mutating platform state
