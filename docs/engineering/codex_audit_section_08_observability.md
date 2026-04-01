# Codex Audit Section 08

**Section:** 8. Observability, logging, and failure containment
**Date:** 2026-04-02
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- Sentry is installed and request-level error capture is wired up, but the platform still has material observability gaps.
- The most serious problem is access control, not tooling: the admin telemetry page is readable by any logged-in user.
- The next biggest problem is coverage. Some of the most important failures are handled locally and never make it into either `api_request_logs` or Sentry.

## Commands Run

- Read:
  - `civis-core/lib/api-logger.ts`
  - `civis-core/instrumentation.ts`
  - `civis-core/instrumentation-client.ts`
  - `civis-core/sentry.server.config.ts`
  - `civis-core/sentry.edge.config.ts`
  - `civis-core/next.config.mjs`
  - `civis-core/app/global-error.tsx`
  - `civis-core/lib/feed-cache.ts`
  - `civis-core/app/feed/admin/page.tsx`
  - `civis-core/app/api/v1/constructs/route.ts`
  - `civis-core/app/api/v1/constructs/search/route.ts`
  - `civis-core/app/api/v1/constructs/explore/route.ts`
  - `civis-core/app/api/mcp/[transport]/route.ts`
  - `civis-core/app/api/internal/feed/route.ts`
  - `civis-core/app/api/internal/search/route.ts`
  - `civis-core/app/api/internal/feedback/route.ts`
  - `civis-core/supabase/migrations/022_api_request_logs.sql`
  - `civis-core/DEPLOYMENT.md`
- Searched the repo for:
  - `logApiRequest`
  - `console.error`
  - `Sentry`
  - `captureRequestError`
  - `after(`
  - `best-effort`
  - `catch {}`
  - operator and admin role checks

## Findings

### AUD-029: The admin telemetry page is exposed to any logged-in user

**Severity:** High

The admin page only checks for a valid session:

- `civis-core/app/feed/admin/page.tsx:21`
- `civis-core/app/feed/admin/page.tsx:22`

It then immediately creates a service-role client:

- `civis-core/app/feed/admin/page.tsx:24`

and reads internal telemetry tables and analytics:

- `civis-core/app/feed/admin/page.tsx:38`
- `civis-core/app/feed/admin/page.tsx:41`

That includes:

- raw request endpoint history
- stored request params such as search queries
- IP prefixes
- user agents
- developer and agent counts

The schema comments make clear that `api_request_logs` is not meant to be publicly readable:

- `civis-core/supabase/migrations/022_api_request_logs.sql:20`

The repo also already has an operator concept:

- `docs/engineering/architecture.md:69`

but `/feed/admin` does not check it.

Inference from the code: any ordinary authenticated developer account can read internal request telemetry by visiting `/feed/admin`. This is a data-exposure bug, not just a missing polish item.

### AUD-030: Critical request failures are missing from telemetry

**Severity:** Medium

The request logger is best-effort and silent on failure:

- `civis-core/lib/api-logger.ts:17`
- `civis-core/lib/api-logger.ts:37`

Unhandled request exceptions would still go through Sentry request capture:

- `civis-core/instrumentation.ts:13`

but many of the most important server failures are handled locally instead of being thrown.

#### `POST /v1/constructs`

The write route has no `logApiRequest` calls anywhere in its POST path:

- `civis-core/app/api/v1/constructs/route.ts:53`

The most important write-path failures return `500` directly:

- embedding generation failure
  - `civis-core/app/api/v1/constructs/route.ts:127`
  - `civis-core/app/api/v1/constructs/route.ts:135`
- insert failure
  - `civis-core/app/api/v1/constructs/route.ts:176`
  - `civis-core/app/api/v1/constructs/route.ts:189`

Success only invalidates cache:

- `civis-core/app/api/v1/constructs/route.ts:198`

So the public write path is effectively absent from the API monitor.

#### `GET /v1/constructs/search`

Search logs `429` and `200`:

- `civis-core/app/api/v1/constructs/search/route.ts:37`
- `civis-core/app/api/v1/constructs/search/route.ts:108`

But its handled `500` branches return directly without telemetry:

- embedding failure
  - `civis-core/app/api/v1/constructs/search/route.ts:81`
  - `civis-core/app/api/v1/constructs/search/route.ts:83`
- RPC failure
  - `civis-core/app/api/v1/constructs/search/route.ts:100`
  - `civis-core/app/api/v1/constructs/search/route.ts:102`

Those branches avoid both `api_request_logs` and Sentry's unhandled-request path.

#### MCP transport

The live MCP transport handles the public tools:

- `civis-core/app/api/mcp/[transport]/route.ts:59`
- `civis-core/app/api/mcp/[transport]/route.ts:139`
- `civis-core/app/api/mcp/[transport]/route.ts:264`
- `civis-core/app/api/mcp/[transport]/route.ts:351`

But the route does not import or call `logApiRequest` at all:

- `civis-core/app/api/mcp/[transport]/route.ts:1`

and several tool failure paths are caught and converted into error responses:

- `civis-core/app/api/mcp/[transport]/route.ts:93`
- `civis-core/app/api/mcp/[transport]/route.ts:130`
- `civis-core/app/api/mcp/[transport]/route.ts:309`
- `civis-core/app/api/mcp/[transport]/route.ts:342`

So the public MCP surface is mostly invisible to the platform's own telemetry.

### AUD-031: Server-side Sentry is configured to capture local variables

**Severity:** Medium

The server Sentry config enables:

- `civis-core/sentry.server.config.ts:6`

with:

- `includeLocalVariables: true`

Unhandled request errors are forwarded through:

- `civis-core/instrumentation.ts:13`

That means server exceptions can send local variable state from handlers into Sentry. In this repo, those locals can include:

- validated construct payloads before insert
  - `civis-core/app/api/v1/constructs/route.ts:123`
- service-role client and request-derived state
  - `civis-core/app/api/v1/constructs/route.ts:143`
- bearer-token auth flow state in MCP verification
  - `civis-core/app/api/mcp/[transport]/route.ts:437`
  - `civis-core/app/api/mcp/[transport]/route.ts:468`

Inference from the code: a server exception in the wrong place can ship user-submitted content, build-log bodies, or credential-adjacent values into third-party telemetry. That is a real data-handling risk, even if it only happens on failure paths.

## Failure-Containment Notes

- `logApiRequest()` is intentionally fail-open and fully silent:
  - `civis-core/lib/api-logger.ts:37`
- feed-cache invalidation is also fail-open and silent:
  - `civis-core/lib/feed-cache.ts:6`
- rate-limit outages fail open but at least emit `console.error`:
  - `civis-core/lib/rate-limit.ts:47`
  - `civis-core/lib/rate-limit.ts:64`
  - `civis-core/lib/rate-limit.ts:81`
  - `civis-core/lib/rate-limit.ts:106`

This containment strategy is reasonable for user-facing uptime, but the tradeoff is that important operational failures can disappear unless another telemetry path catches them.

## Positive Checks

- Sentry is wired for client, server, edge, and global error capture:
  - `civis-core/instrumentation-client.ts:1`
  - `civis-core/instrumentation.ts:1`
  - `civis-core/sentry.server.config.ts:1`
  - `civis-core/sentry.edge.config.ts:1`
  - `civis-core/app/global-error.tsx:13`
- IPs in `api_request_logs` are prefix-truncated rather than stored in full:
  - `civis-core/lib/api-logger.ts:3`
- rate-limiter Redis outages are explicitly designed to fail open instead of taking down the request path:
  - `civis-core/lib/rate-limit.ts:47`
  - `civis-core/lib/rate-limit.ts:64`
  - `civis-core/lib/rate-limit.ts:81`
  - `civis-core/lib/rate-limit.ts:106`
- feed-cache invalidation and authenticated pull tracking are both isolated as best-effort background work, so they do not directly break caller responses

## Assumptions Checked

- `/feed/admin` is intended to be a privileged operator surface because it exposes telemetry and uses the service-role client
- `api_request_logs` is the platform's first-party telemetry source for the API monitor and request analytics
- Sentry request capture applies to unhandled request failures, not to locally handled `500` responses

## Gaps Not Fully Verified

- I did not sign in as a non-operator user and hit `/feed/admin` live, so the access-control finding is code-proven rather than session-probed
- I did not trigger live Sentry events to inspect whether server locals are actually redacted downstream
- I did not test whether Vercel `after()` task failures surface anywhere outside the platform code paths reviewed here

## Recommended Next Section

Run **Section 9: Critical frontend and operator flows** next.

Reason:

- the observability layer is now understood well enough to evaluate high-risk UI and operator flows without guessing how failures surface
- `/feed/admin`, owner controls, the new-post path, and the alpha-gate/middleware behavior are all now primed for a focused frontend and operator audit
