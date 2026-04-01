# Codex Audit Section 02

**Section:** 2. Authentication, session, and credential lifecycle
**Date:** 2026-04-01
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- Auth boundaries are only partially sound.
- The good news: owner-only server actions consistently check for a Supabase session first, re-check ownership through RLS on `agent_entities`, and only then use the service-role client for `agent_credentials` mutations. I found no evidence of `SUPABASE_SERVICE_ROLE_KEY` usage in client-side files.
- The bad news: credential rotation has a real availability bug, invalid bearer tokens are not handled consistently across all public endpoints, the OAuth callback makes a brittle provider-identity assumption, and the new-key display flow can leak a just-created key across account changes in the same browser session.

## Commands Run

- Read: `civis-core/lib/auth.ts`
- Read: `civis-core/lib/api-auth.ts`
- Read: `civis-core/lib/supabase/server.ts`
- Read: `civis-core/app/feed/auth/callback/route.ts`
- Read: `civis-core/app/feed/agents/actions.ts`
- Read: `civis-core/app/feed/agent/[id]/page.tsx`
- Read: `civis-core/app/feed/agent/[id]/owner-controls.tsx`
- Read: `civis-core/app/feed/agents/create/page.tsx`
- Read: `civis-core/app/feed/agents/new-key/page.tsx`
- Read: `civis-core/app/feed/agents/new-key/client.tsx`
- Read: `civis-core/app/api/v1/agents/[id]/route.ts`
- Read: `civis-core/app/api/v1/agents/[id]/constructs/route.ts`
- Read: `civis-core/app/api/v1/stack/route.ts`
- Read: `civis-core/app/api/mcp/[transport]/route.ts`
- Read: targeted sections of `civis-core/supabase/migrations/000_consolidated_schema.sql`
- Live probe with a locally configured agent API key against `/api/v1/constructs`
- Live probe with an invalid bearer token against `/api/v1/constructs`, `/api/v1/agents/:id`, `/api/v1/stack`, and `https://mcp.civis.run/mcp`

## Findings

### AUD-006: Key rotation can revoke every active credential before replacement exists

**Severity:** High

`generateNewKey()` verifies ownership correctly, but then revokes all active keys before attempting to insert the replacement:

- `civis-core/app/feed/agents/actions.ts:253` revokes all active credentials for the agent
- `civis-core/app/feed/agents/actions.ts:269` inserts the replacement key afterward
- `civis-core/app/feed/agents/actions.ts:273` returns an error if the insert fails, but there is no rollback path

That means a transient Supabase error, trigger failure, or other insert problem can leave the agent with zero working keys. This is a real availability bug.

There is also contract drift here. The architecture and DB trigger both describe a max of **3 active keys per agent**:

- `docs/engineering/architecture.md:72`
- `civis-core/supabase/migrations/000_consolidated_schema.sql:217`

but the action path forces a single-key model by revoking everything before each new key is created.

### AUD-007: Invalid bearer tokens are not rejected consistently across public endpoints

**Severity:** Medium

The intended shared behavior is documented in `authorizeRead()`:

- `civis-core/lib/api-auth.ts:22` says invalid or revoked keys should return `401`

That behavior is real on content endpoints and MCP. Live probes on 2026-04-01 confirmed:

- valid key against `/api/v1/constructs` returns `authenticated=true`
- invalid key against `/api/v1/constructs` returns `401`
- invalid key against `https://mcp.civis.run/mcp` returns `401`

But `/v1/agents/:id` and `/v1/stack` do not use `authorizeRead()` at all:

- `civis-core/app/api/v1/agents/[id]/route.ts:18`
- `civis-core/app/api/v1/stack/route.ts:15`

Live invalid-key probes against both endpoints returned `200`, not `401`. That means the auth contract is inconsistent depending on which public route the client hits.

### AUD-008: OAuth callback uses a brittle provider identity lookup

**Severity:** Medium

The callback derives provider data like this:

- `civis-core/app/feed/auth/callback/route.ts:49` reads the active provider from `app_metadata.provider`
- `civis-core/app/feed/auth/callback/route.ts:53` uses `session.user.identities?.[0]?.id` for non-email providers

That assumes the first identity in the array always matches the active provider. If a user has multiple linked identities, blacklist enforcement and stored `provider_id` can target the wrong identity. I did not reproduce this live, but the code is making an unchecked assumption on a security-sensitive path.

### AUD-009: New-key display flow is not bound to the current user

**Severity:** Low

The server page only checks that some user is logged in:

- `civis-core/app/feed/agents/new-key/page.tsx:5`

The client then reads raw key material from session storage and displays it:

- `civis-core/app/feed/agents/new-key/client.tsx:14`
- `civis-core/app/feed/agents/new-key/client.tsx:28`
- `civis-core/app/feed/agents/new-key/client.tsx:39`

The payload is not bound to a user ID, agent ID, timestamp, or nonce. If `civis_new_api_key` survives a logout, crash, or account switch in the same browser session, a later authenticated user on that browser can view the previous key.

### AUD-010: Auth store failures masquerade as invalid credentials

**Severity:** Medium

`authenticateAgent()` ignores credential lookup errors:

- `civis-core/lib/auth.ts:23`
- `civis-core/lib/auth.ts:31`

If the service-role query fails, times out, or otherwise returns no row, the helper returns `null`. That flows straight into:

- `civis-core/lib/api-auth.ts:29`, which converts it into `invalid_key`
- `civis-core/app/api/mcp/[transport]/route.ts:459`, which also treats a failed lookup as an invalid or revoked key

The result is misleading `401` behavior during backing-store or service-role failures instead of a server error that points to infrastructure trouble.

## Positive Checks

- Owner-only mutations are guarded correctly in the main server actions:
  - session required before action work starts
  - agent ownership re-checked through the authenticated Supabase client
  - service-role mutation happens only after ownership verification
- `revokeCredential()` follows the expected owner-check pattern before touching `agent_credentials`
- Invalid keys do not silently downgrade on the main content endpoints that use `authorizeRead()`
- MCP invalid-key handling explicitly throws to avoid anonymous downgrade:
  - `civis-core/app/api/mcp/[transport]/route.ts:460`

## Assumptions Checked

- Root `.env.local` contains at least one working local agent API key for authenticated non-mutating probes
- Service-role usage appears confined to server-side modules and route handlers, not browser components
- The section is about auth and ownership boundaries, not broader read-path consistency or rate-limit policy

## Gaps Not Fully Verified

- No live revoked-key probe was possible because raw revoked credentials are not stored, only hashes
- Multi-identity Supabase account behavior was not reproduced live, only assessed statically from callback code
- UI interaction paths were not exercised in a real browser session; the new-key leakage finding is based on code flow
- Agent `status` values (`active`, `restricted`, `slashed`) were not evaluated as an enforcement mechanism in this section because no auth path currently checks them

## Recommended Next Section

Run **Section 3: Rate limiting, free-pull gating, and abuse controls** next.

Reason:
- It builds directly on the auth helper and invalid-key work from this section
- It will validate the remaining high-risk request-path behavior around read/write throttling, public gating, and pull-count dedupe
- Several inconsistencies already surfaced at the auth boundary, and the next section will show whether those inconsistencies extend into policy enforcement
