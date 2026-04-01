# Codex Audit Section 09

**Section:** 9. Critical frontend and operator flows
**Date:** 2026-04-02
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- The most serious frontend problem is not visual or state-related. It is data exposure.
- The anonymous app shell and the unauthenticated `api/internal/*` endpoints both leak far more content than the public API contract allows.
- The feed shell also has a correctness bug in its client-side refresh and polling path: it is wired to non-approved rows even though the initial server render is not.

## Commands Run

- Read:
  - `civis-core/app/feed/page.tsx`
  - `civis-core/components/feed-client.tsx`
  - `civis-core/components/build-log-card.tsx`
  - `civis-core/app/feed/[id]/page.tsx`
  - `civis-core/app/feed/new/page.tsx`
  - `civis-core/app/feed/new/client.tsx`
  - `civis-core/app/feed/new/actions.ts`
  - `civis-core/app/feed/agents/page.tsx`
  - `civis-core/app/feed/agents/create/page.tsx`
  - `civis-core/app/feed/agents/new-key/page.tsx`
  - `civis-core/app/feed/agents/new-key/client.tsx`
  - `civis-core/app/feed/agents/actions.ts`
  - `civis-core/app/feed/agent/[id]/page.tsx`
  - `civis-core/app/feed/agent/[id]/owner-controls.tsx`
  - `civis-core/app/feed/alpha-gate/page.tsx`
  - `civis-core/app/api/internal/feed/route.ts`
  - `civis-core/app/api/internal/feed/latest/route.ts`
  - `civis-core/app/api/internal/search/route.ts`
  - `civis-core/app/api/alpha-gate/route.ts`
  - `civis-core/middleware.ts`
- Live probes on 2026-04-02:
  - unauthenticated `GET https://app.civis.run/`
  - unauthenticated `GET https://app.civis.run/api/internal/search?q=python%20auth&limit=1`
  - unauthenticated `GET https://app.civis.run/api/internal/feed?sort=chron&page=1&limit=1`
  - unauthenticated `GET https://app.civis.run/api/internal/feed/latest`
  - read-only authenticated Ronin checks from the previous section to rule out operator-only differences in sampled read flows

## Findings

### AUD-032: The anonymous app shell leaks full build-log payloads to the browser

**Severity:** High

The feed page fetches full `payload` objects with the service-role client:

- `civis-core/app/feed/page.tsx:16`
- `civis-core/app/feed/page.tsx:18`

and passes the result into a client component:

- `civis-core/app/feed/page.tsx:86`
- `civis-core/app/feed/page.tsx:102`

The agent profile page repeats the same pattern:

- `civis-core/app/feed/agent/[id]/page.tsx:86`
- `civis-core/app/feed/agent/[id]/page.tsx:88`
- `civis-core/app/feed/agent/[id]/page.tsx:194`
- `civis-core/app/feed/agent/[id]/page.tsx:335`

The UI cards only render summaries, but the browser still receives the serialized client-component props.

Live proof on 2026-04-02:

- an unauthenticated fetch of `https://app.civis.run/` contained the literal solution text:
  - `Built two complementary modules. The content sanitizer detects 20+ prompt injection patterns...`

for construct:

- `3237c26f-c41f-457f-b4c8-032ef8158d4a`

That means anonymous users do not need the public detail route or an API key to recover full feed content. The browser-delivered app shell already has it.

### AUD-033: Unauthenticated internal APIs bypass public content gating and the alpha gate

**Severity:** High

The internal search route is public and returns full payloads:

- `civis-core/app/api/internal/search/route.ts:60`
- `civis-core/app/api/internal/search/route.ts:75`
- `civis-core/app/api/internal/search/route.ts:79`

The internal feed route is also public and returns full payloads:

- `civis-core/app/api/internal/feed/route.ts:35`
- `civis-core/app/api/internal/feed/route.ts:59`
- `civis-core/app/api/internal/feed/route.ts:82`

Neither route requires a session or an API key. Both use the service-role client.

Middleware does not protect them with the alpha gate:

- `civis-core/middleware.ts:63`
- `civis-core/middleware.ts:66`
- `civis-core/middleware.ts:74`

Live proof on 2026-04-02:

- `GET https://app.civis.run/api/internal/search?q=python%20auth&limit=1` returned `200`
  - response contained `payload.solution`
  - response contained `payload.code_snippet`
- `GET https://app.civis.run/api/internal/feed?sort=chron&page=1&limit=1` returned `200`
  - response contained full `payload` content for the feed item

So the app currently has an unauthenticated side channel that bypasses the public API's gated-content model entirely.

### AUD-034: Client-side feed refresh and polling are wired to non-approved rows

**Severity:** Medium

Initial server render of the chron feed correctly filters approved content:

- `civis-core/app/feed/page.tsx:20`
- `civis-core/app/feed/page.tsx:21`

But the internal chron feed used after hydration does not:

- `civis-core/app/api/internal/feed/route.ts:44`
- `civis-core/app/api/internal/feed/route.ts:59`

And the latest-timestamp poll path also ignores approval status:

- `civis-core/app/api/internal/feed/latest/route.ts:16`

The client relies on those endpoints for:

- feed fetches after hydration
  - `civis-core/components/feed-client.tsx:30`
  - `civis-core/components/feed-client.tsx:34`
- new-post polling
  - `civis-core/components/feed-client.tsx:53`
- refresh
  - `civis-core/components/feed-client.tsx:84`
- sort changes
  - `civis-core/components/feed-client.tsx:107`
- tag clear
  - `civis-core/components/feed-client.tsx:125`
- load more
  - `civis-core/components/feed-client.tsx:138`

This creates two concrete frontend risks:

- the "new posts available" banner can light up because of pending or rejected content that should not count as visible feed content
- a user can move from a clean initial SSR feed into a client-side chron view that includes non-approved rows if such rows exist

I did not reproduce the second behavior live because the sampled production chron feed matched on the one-row probe I used here. But the code-path mismatch is real.

### AUD-035: Alpha-gate redirect handling is lossy and trusts user-controlled navigation input

**Severity:** Medium

Middleware stores only the pathname in the redirect parameter:

- `civis-core/middleware.ts:66`
- `civis-core/middleware.ts:67`

So any original query string is dropped before the user reaches the gate.

The gate page then reads that value directly:

- `civis-core/app/feed/alpha-gate/page.tsx:13`

posts the password:

- `civis-core/app/feed/alpha-gate/page.tsx:20`

and sends the unvalidated redirect target into the client router:

- `civis-core/app/feed/alpha-gate/page.tsx:27`

This is two bugs in one flow:

- deep links behind the gate lose their original query parameters after successful entry
- the redirect target is treated as trusted client navigation input even though it comes from the URL

## Positive Checks

- The direct-link construct page still preserves the intended full-content behavior for non-rejected rows:
  - fetch path excludes only `status = rejected`
    - `civis-core/app/feed/[id]/page.tsx:20`
    - `civis-core/app/feed/[id]/page.tsx:111`
  - the page renders full `payload.solution`
    - `civis-core/app/feed/[id]/page.tsx:292`
- The create-agent and owner-control flows still enforce session-based access before mutation
- Fresh Ronin authenticated probes did not reveal any operator-only special-case behavior in the sampled read flows

## User-Visible Breakpoints

- Anonymous users can recover full solution text from the app shell even when the UI appears summary-only
- Anonymous users can call internal search/feed endpoints and bypass the public content gate
- Feed refresh and "new posts available" can drift away from the approved-content contract
- Alpha-gated deep links can lose state after successful password entry

## Assumptions Checked

- The app shell is intended to show summary cards on feed and profile pages, not to expose full payloads in browser-delivered data
- The `api/internal/*` routes are intended for app UI plumbing, not as public alternatives to `/api/v1/*`
- The direct-link construct page is intentionally allowed to show full content for non-rejected rows

## Gaps Not Fully Verified

- I did not inspect browser devtools network frames for the exact App Router serialization boundary because the plain HTML fetch already proved full-content leakage
- I did not reproduce a live pending-or-rejected construct leak through the client-side chron feed because I do not have a safe public ID for such a row
- I did not execute a browser test for crafted alpha-gate redirect targets, so the redirect-trust issue is based on direct code inspection rather than a live exploit demo

## Recommended Next Section

Run **Section 10: `build_logs` pipeline and content-ops scripts** next.

Reason:

- the app and service surfaces are now audited deeply enough to move into operator-side ingestion and queue logic
- earlier sections already found docs drift and operator-runbook drift, and Section 10 is the right place to connect that to the actual content pipeline
