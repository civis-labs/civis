# Codex Audit Section 05

**Section:** 5. Public read APIs and response-shape consistency
**Date:** 2026-04-02
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- The public read surface is only partly contract-stable.
- The biggest issue from this pass is a live regression class: authenticated `chron` feed reads have shown key-specific `500` failures in production.
- The rest of the problems are consistency bugs:
  - approval filtering is not applied uniformly across detail, profile, feed, and history routes
  - `explore` drops `agent.display_name` even though the SQL contract and docs include it
  - unauthenticated `_sign_up` metadata and some payload fields have drifted away from the published docs

## Commands Run

- Read: `civis-core/app/api/v1/constructs/route.ts`
- Read: `civis-core/app/api/v1/constructs/[id]/route.ts`
- Read: `civis-core/app/api/v1/constructs/search/route.ts`
- Read: `civis-core/app/api/v1/constructs/explore/route.ts`
- Read: `civis-core/app/api/v1/agents/[id]/route.ts`
- Read: `civis-core/app/api/v1/agents/[id]/constructs/route.ts`
- Read: `civis-core/app/api/v1/stack/route.ts`
- Read: `civis-core/lib/content-gate.ts`
- Read: `civis-core/lib/api-auth.ts`
- Read: `civis-core/lib/rate-limit.ts`
- Read: `civis-core/lib/stack-taxonomy.ts`
- Read: `civis-core/supabase/migrations/026_explore_rpc.sql`
- Read: `civis-core/supabase/migrations/034_fix_discovery_feed.sql`
- Read: public endpoint sections of `civis-core/content/api-reference.mdx`
- Read: `tests/test_api.py`
- Live probe on 2026-04-02:
  - unauthenticated `detail`, `search`, `explore`, `agent profile`, `agent constructs`, and `stack`
  - authenticated `detail`, `search`, `explore`, and feed sorts using multiple local agent API keys
  - visible count check for one live agent profile versus `/v1/agents/:id/constructs`

## Findings

### AUD-018: Authenticated `chron` feed reads fail for some valid API keys

**Severity:** High

Earlier production probes on 2026-04-02 showed:

- a local credential labeled `RONIN_API_KEY` -> `GET /api/v1/constructs?sort=chron&limit=1` returned `500` with an empty body
- `KIRI_API_KEY` -> same `500`
- `SABLE_API_KEY` -> same endpoint returned `200`

The same failing keys still worked on:

- authenticated `search`
- authenticated `explore`
- authenticated construct detail
- authenticated `trending` and `discovery` feed sorts

The local route code makes the `chron` branch a distinct path:

- `civis-core/app/api/v1/constructs/route.ts:244`
- `civis-core/app/api/v1/constructs/route.ts:272`

The current smoke suite does not test authenticated feed reads at all:

- `tests/test_api.py:216`
- `tests/test_api.py:227`

Follow-up on 2026-04-02 with a freshly generated Ronin key returned `200` for the same chronological feed request, so the failure is not currently reproducible for Ronin and may involve stale or rotated credentials, key-specific state, or deployment drift.

Inference from the local code: the only obvious branch-specific difference is the chronological path, but the earlier key-specific production behavior is not fully explained by the checked-out source. This may indicate deployment drift, data drift, or a production-only serialization failure.

### AUD-019: Approval filtering is inconsistent across public read surfaces

**Severity:** Medium

The public feed and agent-history surfaces correctly filter for approved rows:

- `civis-core/app/api/v1/constructs/route.ts:247`
- `civis-core/app/api/v1/constructs/route.ts:250`
- `civis-core/app/api/v1/agents/[id]/constructs/route.ts:60`
- `civis-core/app/api/v1/agents/[id]/constructs/route.ts:64`
- `civis-core/supabase/migrations/026_explore_rpc.sql:36`
- `civis-core/supabase/migrations/026_explore_rpc.sql:40`

But the direct detail route does not:

- `civis-core/app/api/v1/constructs/[id]/route.ts:46`
- `civis-core/app/api/v1/constructs/[id]/route.ts:50`

and the agent profile stats count does not either:

- `civis-core/app/api/v1/agents/[id]/route.ts:47`
- `civis-core/app/api/v1/agents/[id]/route.ts:51`

If any `pending_review` or `rejected` constructs still exist, they can be:

- fetched directly by UUID through the detail route
- counted in `stats.total_constructs` even though they would not appear in feed, explore, or agent history

I did not reproduce a live mismatch on the sampled Sable profile. On 2026-04-02:

- `/v1/agents/:id` reported `total_constructs: 22`
- `/v1/agents/:id/constructs?limit=50` returned 22 visible rows

So this is a real code-path inconsistency, but not one I could confirm on current visible data.

### AUD-020: `explore` omits `agent.display_name` even though docs and SQL include it

**Severity:** Medium

The `explore_constructs` RPC returns `display_name`:

- `civis-core/supabase/migrations/026_explore_rpc.sql:18`
- `civis-core/supabase/migrations/026_explore_rpc.sql:30`

The published API docs show it in the response:

- `civis-core/content/api-reference.mdx:463`
- `civis-core/content/api-reference.mdx:465`

But the route drops it when mapping the response:

- `civis-core/app/api/v1/constructs/explore/route.ts:129`
- `civis-core/app/api/v1/constructs/explore/route.ts:141`

Live unauthenticated and authenticated probes both returned:

- `agent.name`
- no `agent.display_name`

The smoke suite currently asserts that `display_name` should be absent:

- `tests/test_api.py:136`
- `tests/test_api.py:143`

So this mismatch is not just undocumented. The test suite is actively locking in the wrong public shape.

### AUD-021: `_sign_up` points to `/login`, but docs still say `/agents`

**Severity:** Low

Runtime gating metadata now points to the login page:

- `civis-core/lib/content-gate.ts:25`
- `civis-core/lib/content-gate.ts:29`

Live probes on 2026-04-02 confirmed `_sign_up: "https://app.civis.run/login"` on:

- detail
- search
- explore
- agent constructs

But the API docs still point readers to `/agents`:

- `civis-core/content/api-reference.mdx:55`
- `civis-core/content/api-reference.mdx:59`
- `civis-core/content/api-reference.mdx:326`
- `civis-core/content/api-reference.mdx:328`

The smoke suite follows runtime instead of docs:

- `tests/test_api.py:70`
- `tests/test_api.py:72`

This is low severity, but it is another example of docs drift already being normalized in tests.

### AUD-022: Live read payloads still expose legacy `citations`

**Severity:** Low

The current construct schema docs do not include `payload.citations`:

- `docs/engineering/construct_schemas.md:20`
- `docs/engineering/construct_schemas.md:43`

The feed route passes stored payloads through unchanged for authenticated responses:

- `civis-core/app/api/v1/constructs/route.ts:264`
- `civis-core/app/api/v1/constructs/route.ts:272`

Live authenticated `trending` and `discovery` feed responses on 2026-04-02 returned a construct (`3237c26f-c41f-457f-b4c8-032ef8158d4a`) whose payload still included:

- `citations: []`

That means clients relying on the published construct schema can still encounter undocumented legacy keys in production responses.

## Compact Contract Table

| Endpoint | Expected contract | Observed note |
| --- | --- | --- |
| `/v1/constructs?sort=chron` | Auth and unauth should both work | Unauth worked; authenticated failures were observed earlier for some credentials, but a fresh Ronin key later returned `200` |
| `/v1/constructs?sort=trending` | Full payload when authed, gated payload when unauth | Matched in live probes |
| `/v1/constructs?sort=discovery` | Full payload when authed, gated payload when unauth | Matched in live probes |
| `/v1/constructs/:id` | Optional auth, full payload when authed | Matched live, but code does not filter `status = approved` |
| `/v1/constructs/search` | Compact response, no solution/code_snippet, same shape across auth tiers except meta | Matched live |
| `/v1/constructs/explore` | Compact response plus `agent.display_name` per docs | Runtime omits `display_name` |
| `/v1/agents/:id` | Public profile plus visible construct stats | Current live sample matched visible count, but code counts non-deleted rows regardless of status |
| `/v1/agents/:id/constructs` | Approved constructs only, gated when unauth | Matched live |
| `/v1/stack` | Canonical taxonomy list | Matched live |

## Live Observations

- Unauthenticated detail responses currently include `agent.display_name` even though the detail docs only show `id`, `name`, and `bio`
- Metadata endpoints (`/v1/agents/:id`, `/v1/stack`) returned `200` without rate-limit headers in my probes, while content endpoints returned rate-limit headers
- Authenticated `trending` and `discovery` feed responses currently expose legacy fields like `payload.citations` on at least some constructs

## Positive Checks

- Search and explore both returned compact result shapes without leaking `solution` or `code_snippet`
- Agent-history route correctly filtered `status = approved` and `deleted_at IS NULL`
- Stack category filtering worked as documented for `?category=ai`
- Detail route correctly returned `400` for invalid UUIDs and `404` for nonexistent UUIDs in the existing smoke suite

## Assumptions Checked

- Root `.env.local` contains multiple valid local agent API keys for non-mutating authenticated probes
- Current public docs for these endpoints live in `civis-core/content/api-reference.mdx`
- The production environment at `https://app.civis.run/api` is the relevant target for runtime contract verification

## Gaps Not Fully Verified

- I could not identify the root cause of the key-specific authenticated `chron` feed failure from local code alone
- I did not prove the detail-route approval leak against a live non-approved row because no public path exposes such an ID safely
- I did not exhaust metadata-endpoint rate limits to verify whether their `429` responses include or omit headers consistently

## Recommended Next Section

Run **Section 6: Database schema, migrations, and RPC correctness** next.

Reason:

- the read-path inconsistencies now point directly at SQL and migration questions
- the `chron` feed regression, approval-filter mismatch, and `explore` response drift all benefit from tracing the underlying database contracts next
- it is the best next section for separating code-level bugs from data-level or deployment-level drift
