# Codex Audit Section 11

**Section:** 11. Dependency, environment, and deployment review
**Date:** 2026-04-02
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- This section found both current package risk and significant deployment-contract drift.
- The highest-severity dependency issue is on the live MCP transport: current pinned MCP transport packages are flagged by `npm audit`.
- The biggest operational drift is in the environment and URL contract: the app expects one set of hosts and secrets at runtime, while the docs and examples still describe another.

## Commands Run

- Read:
  - `civis-core/package.json`
  - `civis-core/package-lock.json`
  - `civis-core/next.config.mjs`
  - `civis-core/vercel.json`
  - `civis-core/.env.example`
  - `civis-core/DEPLOYMENT.md`
  - `civis-core/README.md`
  - `civis-core/lib/env.ts`
  - `civis-core/lib/redis.ts`
  - `civis-core/lib/embeddings.ts`
  - `civis-core/lib/supabase/server.ts`
  - `civis-core/lib/supabase/browser.ts`
  - `civis-core/middleware.ts`
  - `civis-core/app/layout.tsx`
  - `civis-core/app/sitemap.ts`
  - `civis-core/app/robots.ts`
  - `civis-core/instrumentation.ts`
  - `civis-core/instrumentation-client.ts`
  - `civis-core/sentry.server.config.ts`
  - `civis-core/sentry.edge.config.ts`
  - `civis-core/app/feed/new/actions.ts`
  - `civis-core/app/feed/agents/actions.ts`
  - `civis-core/app/api/mcp/[transport]/route.ts`
- Local checks on 2026-04-02:
  - repo-wide `process.env.*` extraction
  - repo-wide package-usage scan against `package.json`
  - `npm audit --omit=dev --json`
- Live probes on 2026-04-02:
  - `https://civis.run/login`
  - `https://app.civis.run/login`
  - `https://civis.run/agent/ronin`
  - `https://app.civis.run/agent/ronin`
  - `https://civis.run/sitemap.xml`
  - `https://app.civis.run/api/webhooks/stripe`

## Findings

### AUD-042: The live MCP transport is pinned to currently vulnerable packages

**Severity:** High

The MCP stack is pinned directly in the app package:

- `civis-core/package.json:14`
- `civis-core/package.json:23`

and imported directly by the public MCP route:

- `civis-core/app/api/mcp/[transport]/route.ts:1`
- `civis-core/app/api/mcp/[transport]/route.ts:2`

On 2026-04-02, `npm audit --omit=dev --json` reported:

- `@modelcontextprotocol/sdk` `1.25.2`
- `mcp-handler` `1.0.7`

as affected by a high-severity advisory for cross-client data leakage via shared server or transport reuse, with a fix available.

Inference from the code and advisory scope: this is not dead code. It is on the live public MCP surface, so the dependency exposure is directly relevant to production.

### AUD-043: Civis is pinned to a currently advised-against Next.js patch level

**Severity:** Medium

The app is pinned to:

- `civis-core/package.json:24`

which is `next` `16.1.6`.

On 2026-04-02, `npm audit --omit=dev --json` reported multiple current advisories fixed in `16.2.2`, including:

- rewrite-related request smuggling
- null-origin bypass of Server Actions CSRF checks
- related request buffering and cache concerns

Those are relevant to Civis because the app actively uses:

- middleware rewrites
  - `civis-core/middleware.ts:30`
  - `civis-core/middleware.ts:69`
  - `civis-core/middleware.ts:95`
- server actions
  - `civis-core/app/feed/new/actions.ts:1`
  - `civis-core/app/feed/agents/actions.ts:1`

Inference: this is not a generic framework warning. The affected Next surfaces are part of the current deployment shape.

### AUD-044: Root-level env validation makes the whole app depend on service-only secrets

**Severity:** Medium

The root layout runs env validation unconditionally:

- `civis-core/app/layout.tsx:7`

The validator requires:

- `SUPABASE_SERVICE_ROLE_KEY`
  - `civis-core/lib/env.ts:4`
- `OPENAI_API_KEY`
  - `civis-core/lib/env.ts:5`
- `UPSTASH_REDIS_REST_URL`
  - `civis-core/lib/env.ts:6`
- `UPSTASH_REDIS_REST_TOKEN`
  - `civis-core/lib/env.ts:7`

and throws hard if they are missing:

- `civis-core/lib/env.ts:18`

That is compounded by eager client construction:

- Redis
  - `civis-core/lib/redis.ts:4`
  - `civis-core/lib/redis.ts:5`
- OpenAI embeddings
  - `civis-core/lib/embeddings.ts:3`
  - `civis-core/lib/embeddings.ts:5`
  - `civis-core/lib/embeddings.ts:6`

Inference: routes that do not need semantic search or write-path infrastructure still inherit those deployment requirements because validation happens at the root layout level. That makes preview, docs-only, or partial-environment deploys more fragile than they need to be.

### AUD-045: Metadata and sitemap generation point app-only routes at the wrong host

**Severity:** Medium

The deployment guide tells operators to use:

- `civis-core/DEPLOYMENT.md:46`

for `NEXT_PUBLIC_BASE_URL`, with `https://civis.run` as the example.

That same variable feeds:

- root metadata base
  - `civis-core/app/layout.tsx:29`
  - `civis-core/app/layout.tsx:30`
- sitemap generation
  - `civis-core/app/sitemap.ts:4`
  - `civis-core/app/sitemap.ts:25`
  - `civis-core/app/sitemap.ts:29`
  - `civis-core/app/sitemap.ts:36`
- robots sitemap pointer
  - `civis-core/app/robots.ts:10`

But middleware makes clear that app routes are on the app host:

- `civis-core/middleware.ts:53`
- `civis-core/middleware.ts:69`
- `civis-core/middleware.ts:95`

Live probes on 2026-04-02 confirmed the mismatch:

- `https://civis.run/login` returned `404`
- `https://app.civis.run/login` returned `200`
- `https://civis.run/agent/ronin` returned `404`
- `https://app.civis.run/agent/ronin` returned `200`

I also fetched the live sitemap at `https://civis.run/sitemap.xml`, and it currently publishes `https://civis.run/login` and `https://civis.run/agent/...` URLs.

Inference: the platform is currently generating public metadata and sitemap entries that point crawlers and share cards at URLs that do not resolve on the documented base host.

### AUD-046: The published env and deployment contract still describes removed services

**Severity:** Medium

The example env file still includes:

- `CRON_SECRET`
  - `civis-core/.env.example:14`
- `STRIPE_SECRET_KEY`
  - `civis-core/.env.example:17`
- `STRIPE_WEBHOOK_SECRET`
  - `civis-core/.env.example:18`

The deployment guide still says Stripe is required:

- `civis-core/DEPLOYMENT.md:12`
- `civis-core/DEPLOYMENT.md:39`
- `civis-core/DEPLOYMENT.md:40`
- `civis-core/DEPLOYMENT.md:137`

But the live Stripe webhook path does not exist. A probe of:

- `https://app.civis.run/api/webhooks/stripe`

returned `404` on 2026-04-02.

At the same time, the live alpha-gate toggle is documented in deployment:

- `civis-core/DEPLOYMENT.md:47`

and used by code:

- `civis-core/middleware.ts:57`
- `civis-core/app/api/alpha-gate/route.ts:5`

but `ALPHA_PASSWORD` is missing from `.env.example`.

Inference: `.env.example` and `DEPLOYMENT.md` are no longer a faithful setup contract. They both overstate removed infrastructure and understate current runtime switches.

### AUD-047: All environments report to the same hardcoded Sentry project

**Severity:** Medium

The runtime DSN is hardcoded in:

- client
  - `civis-core/instrumentation-client.ts:4`
- server
  - `civis-core/sentry.server.config.ts:4`
- edge
  - `civis-core/sentry.edge.config.ts:4`

`next.config.mjs` only uses env for source-map upload auth:

- `civis-core/next.config.mjs:29`

not for the runtime DSN.

Inference: local development, preview deploys, and forks will all emit telemetry into the same Sentry project by default. Combined with the Section 8 finding about sensitive local variables on the server, that creates noisy and potentially confusing cross-environment telemetry.

## Dead-Code And Stale-Artifact Candidates

- `civis-core/README.md` is still the default `create-next-app` boilerplate:
  - `civis-core/README.md:1`
- `civis-core/vercel.json` exists but is empty:
  - `civis-core/vercel.json:1`
- Repo-wide code scan on 2026-04-02 found zero code references to these declared runtime dependencies:
  - `@anthropic-ai/sdk`
    - `civis-core/package.json:13`
  - `clsx`
    - `civis-core/package.json:21`
  - `tailwind-merge`
    - `civis-core/package.json:33`

These are not confirmed bugs, but they are credible cleanup candidates.

## Positive Checks

- The repo has a lockfile, so production installs are not floating:
  - `civis-core/package-lock.json`
- The core runtime env vars are at least documented in both `.env.example` and `DEPLOYMENT.md`
- The Supabase browser/server/service split is explicit rather than hidden behind one ambiguous helper

## Assumptions Checked

- Section 11 stayed non-mutating. I did not change packages, environment files, or deployment config.
- Live endpoint probes were read-only and limited to host and route verification.
- The dependency findings distinguish between advisories on truly live surfaces and advisories on transitive packages with unclear runtime reach.

## Gaps Not Fully Verified

- I did not run a full `next build`, so this section does not claim build success under a fresh environment.
- I did not inspect the actual Vercel project settings or Sentry dashboard; deployment conclusions are based on repo code, docs, and live endpoint behavior.
- I did not enumerate every transitive advisory from `npm audit` in the register. I focused on the ones that clearly intersect with live Civis features.

## Recommended Next Section

Run **Section 12: tests, coverage gaps, and audit closeout** next.

Reason:

- the critical service, transport, operator, and deployment surfaces are now audited
- Section 12 is the right place to convert the findings register into a remediation order and a minimum-confidence test plan
