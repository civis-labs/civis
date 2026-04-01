# Codex Audit Section 03

**Section:** 3. Rate limiting, free-pull gating, and abuse controls
**Date:** 2026-04-01
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- The core abuse controls mostly behave as intended.
- Confirmed live:
  - invalid bearer tokens are rejected on content endpoints
  - authenticated detail pulls dedupe by agent plus construct within one hour
  - authenticated explore enforces a second 10/hour limiter on top of the normal read limiter
  - public direct-link website pages are separate from API gating and render full content
  - custom client-supplied `x-real-ip` headers did not produce separate buckets in live probes
- The main problems are edge semantics, not the primary limiter values:
  - anonymous free-pull gating fails closed if Redis is unavailable
  - successful `200` responses include `Retry-After`
  - one architecture doc still describes the old search/explore free-budget behavior

## Commands Run

- Read: `civis-core/lib/rate-limit.ts`
- Read: `civis-core/lib/free-pulls.ts`
- Read: `civis-core/lib/api-auth.ts`
- Read: `civis-core/app/api/v1/constructs/route.ts`
- Read: `civis-core/app/api/v1/constructs/[id]/route.ts`
- Read: `civis-core/app/api/v1/constructs/search/route.ts`
- Read: `civis-core/app/api/v1/constructs/explore/route.ts`
- Read: `civis-core/app/api/mcp/[transport]/route.ts`
- Read: `civis-core/app/feed/[id]/page.tsx`
- Read: relevant rate-limit sections in `docs/engineering/architecture.md`
- Read: relevant API docs in `civis-core/content/api-reference.mdx`
- Live probe: authenticated feed requests with changing `x-real-ip` header values
- Live probe: repeated unauthenticated detail requests until free-pull gating was visibly active
- Live probe: repeated authenticated detail requests on the same construct to confirm pull-count dedupe
- Live probe: repeated authenticated explore requests until the 10/hour explore limiter returned `429`

## Findings

### AUD-011: Free-pull gating fails closed if Redis is unavailable

**Severity:** Medium

The general rate-limit helpers all catch Redis errors and fail open:

- `civis-core/lib/rate-limit.ts:47`
- `civis-core/lib/rate-limit.ts:64`
- `civis-core/lib/rate-limit.ts:81`
- `civis-core/lib/rate-limit.ts:106`

but the free-pull helper does not:

- `civis-core/lib/free-pulls.ts:11`

That helper is called directly from:

- `civis-core/app/api/v1/constructs/[id]/route.ts:64`
- `civis-core/app/api/mcp/[transport]/route.ts:207`

So a Redis outage does not just disable anonymous gating, it can break unauthenticated detail retrieval entirely for both REST and MCP. That is inconsistent with the rest of the abuse-control layer and risks taking down the shareable public read path during an infrastructure incident.

### AUD-012: `Retry-After` is emitted on successful 200 responses

**Severity:** Low

`rateLimitHeaders()` adds `Retry-After` whenever a reset time exists:

- `civis-core/lib/api-auth.ts:57`
- `civis-core/lib/api-auth.ts:62`

Because that helper is also used for successful responses, content endpoints can send `Retry-After` on `200 OK`. Live explore probes on 2026-04-01 returned `200` along with:

- `X-RateLimit-Limit: 60`
- `X-RateLimit-Remaining: 57`
- `Retry-After: 22`

This is semantically misleading for clients and intermediaries. `Retry-After` should only be attached when the server is actually asking the caller to wait.

### AUD-013: Architecture docs still describe the old search/explore free-budget model

**Severity:** Low

The architecture doc still says:

- `docs/engineering/architecture.md:119` "Shares the same 5-free-per-IP budget as search (combined pool)."

That no longer matches the live implementation:

- `civis-core/app/api/v1/constructs/search/route.ts:32` uses `authorizeRead()` only
- `civis-core/app/api/v1/constructs/explore/route.ts:23` uses `authorizeRead()` and the explore limiter only
- `civis-core/content/api-reference.mdx:275` documents the free-pull budget on detail retrieval instead

This is documentation drift rather than a runtime bug, but it can mislead integrators about when free-budget depletion actually happens.

## Truth Table

| Caller state | Endpoint class | Expected behavior | Observed result |
| --- | --- | --- | --- |
| No auth | Content read (`/v1/constructs`, search, explore, agent constructs) | 30/hr public rate limit | Matches code and live probes |
| No auth | Detail (`/v1/constructs/:id`) with free pulls remaining | Full content, `free_pulls_remaining` decremented | Observed |
| No auth | Detail after free-pull budget exhausted | Metadata only, `free_pulls_remaining: 0` | Observed |
| Valid key | Content read | 60/min per IP, full content where applicable | Observed |
| Valid key | Explore | 60/min plus separate 10/hr explore limiter | Observed, 11th request returned `429` with `X-RateLimit-Limit: 10` |
| Valid key | Repeated detail pull, same agent and same construct within 1 hour | One `pull_count` increment only | Observed |
| Invalid key | Content endpoints using `authorizeRead()` | `401`, no downgrade to public tier | Observed |
| No auth | Website direct link page | Full content regardless of API gating | Confirmed statically in `app/feed/[id]/page.tsx` |

## Live Observations

### IP extraction assumption held in public probes

I sent authenticated requests with different custom `x-real-ip` values. The returned remaining counters continued as one shared sequence instead of resetting per fake header:

- request 1 with `203.0.113.10` returned `remaining=59`
- request 2 with `203.0.113.10` returned `remaining=58`
- request 3 with `203.0.113.11` returned `remaining=57`

That is consistent with the edge overwriting or discarding the client-supplied header, which supports the intended "not spoofable from the client" assumption.

### Free-pull boundary behaved as designed

The live probe started from a partially consumed anonymous budget on the current IP, but the boundary behavior matched the code:

- last free call returned full content with `free_pulls_remaining: 0`
- subsequent calls returned metadata only with `free_pulls_remaining: 0`

This matches `checkFreePullBudget()`, which allows the fifth pull and then gates on the sixth.

### Pull-count dedupe behaved as designed

For the same construct and same authenticated agent, live reads returned:

- unauthenticated pull count: `0`
- first authenticated detail response: `0`
- second authenticated detail response: `1`
- third authenticated detail response: `1`

That is consistent with the post-response increment plus the one-hour dedupe key in:

- `civis-core/app/api/v1/constructs/[id]/route.ts:81`

### Explore limiter behaved as designed

After ten authenticated explore requests, the next request returned:

- `429`
- `X-RateLimit-Limit: 10`
- `X-RateLimit-Remaining: 0`
- `Retry-After: 3526`
- body: `{"error":"Explore rate limit exceeded"}`

## Positive Checks

- API POST write limiting is applied after validation, so bad payloads do not burn quota
- API POST refunds the write token on embedding failure, duplicate rejection, and insert failure
- Public website detail rendering is separate from API gating and uses the service-role path to render full `payload.solution`
- Authenticated pull tracking is best-effort and does not block the main response path

## Assumptions Checked

- Root `.env.local` contains at least one working API key for non-mutating authenticated probes
- The deployed edge path is the relevant place to test `x-real-ip` trust assumptions
- This section is about abuse-control behavior, not deeper schema or transport parity questions

## Gaps Not Fully Verified

- Redis outage behavior was assessed statically from code paths, not reproduced live
- Write-limit refund behavior was reviewed statically rather than by sending real POSTs, to avoid mutating platform state
- Public 30/hour and authenticated 60/min global limit ceilings were not fully exhausted end-to-end because the explore-specific limiter provided a lower-impact live boundary to verify
- MCP free-pull gating was inspected statically and inferred from the shared helper, not exercised separately over the wire in this section

## Recommended Next Section

Run **Section 4: Construct write path and validation** next.

Reason:
- It follows directly from the write-limiter and refund logic reviewed here
- It covers the highest-risk mutation path in the platform
- It is the next place most likely to produce correctness bugs with direct impact on stored platform data
