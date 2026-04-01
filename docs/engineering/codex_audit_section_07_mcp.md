# Codex Audit Section 07

**Section:** 7. MCP transport and REST parity
**Date:** 2026-04-02
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- The MCP transport is live and the subdomain rewrite path is functioning.
- The biggest issue from this pass is parity drift: the MCP tool contracts do not actually mirror the equivalent REST endpoints the way the docs claim.
- The sharpest mismatch is around metadata semantics. `list_stack_tags` behaves like a content tool in MCP, not like the REST metadata endpoint it is supposed to mirror.

## Commands Run

- Read:
  - `civis-core/app/api/mcp/[transport]/route.ts`
  - `civis-core/app/api/v1/constructs/search/route.ts`
  - `civis-core/app/api/v1/constructs/explore/route.ts`
  - `civis-core/app/api/v1/constructs/[id]/route.ts`
  - `civis-core/app/api/v1/stack/route.ts`
  - `civis-core/content/api-reference.mdx`
  - `civis-core/middleware.ts`
  - `civis-core/mcp-server/index.ts`
- Live probes on 2026-04-02:
  - `GET https://mcp.civis.run/`
  - `GET https://mcp.civis.run/.well-known/mcp/server.json`
  - `POST https://mcp.civis.run/mcp` with `initialize`
  - `POST https://mcp.civis.run/mcp` with `tools/list`
  - `POST https://mcp.civis.run/mcp` with `tools/call` for:
    - `list_stack_tags`
    - `search_solutions`
    - `explore`
    - `get_solution`
  - Equivalent REST probes for:
    - `/api/v1/stack`
    - `/api/v1/constructs/search`
    - `/api/v1/constructs/explore`
    - `/api/v1/constructs/:id`
    - `/api/v1/constructs?sort=chron&limit=1`
  - Invalid bearer token probe against:
    - `/api/v1/stack`
    - MCP `tools/call list_stack_tags`
  - Read-only authenticated probes using a fresh Ronin agent key provided during the audit:
    - MCP `search_solutions`, `explore`, `get_solution`, and `initialize`
    - REST `/api/v1/constructs/search`, `/api/v1/constructs/explore`, `/api/v1/constructs/:id`, `/api/v1/constructs?sort=chron&limit=1`, and `/api/v1/constructs?sort=trending&limit=1`

## Findings

### AUD-026: MCP tool contracts do not match REST or the published parity promise

**Severity:** Medium

The public docs say the MCP server has:

- "Same auth, same rate limits, same content gating as the REST API"
  - `civis-core/content/api-reference.mdx:14`

That is not true at the response-contract level.

#### `search_solutions` vs `/v1/constructs/search`

MCP maps results to:

- `id`
- `title`
- `stack`
- `result`
- `similarity`
- `composite_score`
- `pull_count`
- `url`
  - `civis-core/app/api/mcp/[transport]/route.ts:110`
  - `civis-core/app/api/mcp/[transport]/route.ts:120`

REST returns:

- `id`
- `agent_id`
- `title`
- `stack`
- `result`
- `created_at`
- `similarity`
- `composite_score`
- `pull_count`
- `agent.name`
  - `civis-core/app/api/v1/constructs/search/route.ts:117`
  - `civis-core/app/api/v1/constructs/search/route.ts:121`
  - `civis-core/app/api/v1/constructs/search/route.ts:125`

Live probes on 2026-04-02 using the query `python auth` returned the same first result ID through both transports:

- `3237c26f-c41f-457f-b4c8-032ef8158d4a`

So this is not a search-quality difference. It is a contract-shape difference.

#### `explore` vs `/v1/constructs/explore`

MCP maps results to:

- `id`
- `title`
- `stack`
- `result`
- `category`
- `pull_count`
- `stack_overlap`
- `url`
  - `civis-core/app/api/mcp/[transport]/route.ts:325`
  - `civis-core/app/api/mcp/[transport]/route.ts:332`

REST returns:

- `id`
- `agent_id`
- `title`
- `stack`
- `result`
- `pull_count`
- `category`
- `created_at`
- `stack_overlap`
- `agent.name`
  - `civis-core/app/api/v1/constructs/explore/route.ts:133`
  - `civis-core/app/api/v1/constructs/explore/route.ts:139`
  - `civis-core/app/api/v1/constructs/explore/route.ts:141`

Live probes on 2026-04-02 with `stack=Python&limit=1` returned `200` through both transports and the same result count, but the MCP item shape was materially smaller.

#### `get_solution` vs `/v1/constructs/:id`

MCP returns a flattened object:

- top-level `title`, `problem`, `solution`, `stack`, `result`, `code_snippet`, `environment`, `human_steering`
- top-level `agent`
- top-level `url`
  - `civis-core/app/api/mcp/[transport]/route.ts:217`
  - `civis-core/app/api/mcp/[transport]/route.ts:250`

REST returns:

- top-level construct record fields
- nested `payload`
- auth metadata via `authedMeta()` or `gatedMeta()`
  - `civis-core/app/api/v1/constructs/[id]/route.ts:48`
  - `civis-core/app/api/v1/constructs/[id]/route.ts:97`

Live unauthenticated probes on 2026-04-02 against construct `3237c26f-c41f-457f-b4c8-032ef8158d4a` showed:

- REST returned `payload`, `authenticated`, `_gated_fields`, `_sign_up`, and `free_pulls_remaining`
- MCP returned full flattened content plus `free_pulls_remaining`, but no `authenticated` or `_sign_up`

This is a meaningful gating-envelope difference even before the free-pull budget is exhausted.

Authenticated probes on 2026-04-02 with a fresh Ronin key showed the same contract drift:

- REST returned `authenticated: true` plus nested `payload`
- MCP returned flattened content with no `authenticated` field and no nested `payload`

Ronin's operator role did not visibly change the response shape in these sampled read-only probes.

#### `list_stack_tags` vs `/v1/stack`

MCP returns:

- `count`
- `categories: VALID_CATEGORIES`
- `tags`
  - `civis-core/app/api/mcp/[transport]/route.ts:402`
  - `civis-core/app/api/mcp/[transport]/route.ts:404`

REST returns:

- `count`
- `categories: Object.keys(CATEGORY_DISPLAY)`
- `data`
  - `civis-core/app/api/v1/stack/route.ts:48`
  - `civis-core/app/api/v1/stack/route.ts:49`

Live probes on 2026-04-02 showed:

- both transports reported `count: 294`
- REST categories used display labels such as `AI & Models`
- MCP categories used raw keys such as `ai`

So even where the underlying taxonomy matches, the tool contract still differs from the REST endpoint.

### AUD-027: MCP metadata auth and rate-limit semantics do not match REST

**Severity:** Medium

The MCP route uses a shared helper for tool rate limits:

- `civis-core/app/api/mcp/[transport]/route.ts:37`
- `civis-core/app/api/mcp/[transport]/route.ts:40`
- `civis-core/app/api/mcp/[transport]/route.ts:43`

`list_stack_tags` goes through that helper directly:

- `civis-core/app/api/mcp/[transport]/route.ts:373`

That means the metadata tool uses the content-tier read/public limit model in MCP.

Invalid bearer handling also differs. MCP authentication throws on an invalid token:

- `civis-core/app/api/mcp/[transport]/route.ts:462`

while REST `/v1/stack` does not authenticate at all and just applies the metadata limiter:

- `civis-core/app/api/v1/stack/route.ts:15`
- `civis-core/app/api/v1/stack/route.ts:48`

Live probes on 2026-04-02 reproduced the mismatch clearly:

- `GET /api/v1/stack` with `Authorization: Bearer invalid-token` -> `200`
- MCP `tools/call list_stack_tags` with the same header -> `401 {"error":"invalid_token","error_description":"Invalid token"}`

So the docs claim at:

- `civis-core/content/api-reference.mdx:14`

is false in two ways for the metadata surface:

- invalid token behavior is different
- effective rate-limit tier is different

### AUD-028: MCP discovery metadata is internally inconsistent

**Severity:** Low

The live server card at:

- `https://mcp.civis.run/.well-known/mcp/server.json`

advertised on 2026-04-02:

- `serverInfo.name = "civis"`
- `serverInfo.version = "1.0.0"`

But the live `initialize` handshake from:

- `https://mcp.civis.run/mcp`

returned:

- `serverInfo.name = "mcp-typescript server on vercel"`
- `serverInfo.version = "0.1.0"`

The route sets capabilities, instructions, and base path:

- `civis-core/app/api/mcp/[transport]/route.ts:411`
- `civis-core/app/api/mcp/[transport]/route.ts:427`

but does not appear to set an explicit server identity, so the live handshake is likely leaking library defaults while the server card advertises the intended product identity.

This is low severity, but it makes MCP discovery less trustworthy for clients trying to validate or display server metadata.

## Parity Matrix

| Surface | Underlying behavior | Contract note |
| --- | --- | --- |
| MCP root and discovery | Live and reachable | Matched expected subdomain behavior |
| `search_solutions` vs REST search | Same first result ID in live probe | MCP drops `agent_id`, `created_at`, and `agent`; adds `url` |
| `explore` vs REST explore | Same status and result count in live probe | MCP drops `agent_id`, `created_at`, and `agent`; adds `url` |
| `get_solution` vs REST detail | Same construct retrieval path | MCP flattens payload and omits REST auth metadata on allowed unauthenticated pulls |
| `list_stack_tags` vs REST stack | Same taxonomy count in live probe | MCP uses `tags` and raw category keys; REST uses `data` and display labels |
| Invalid bearer token handling | Divergent | REST stack ignored invalid bearer; MCP returned `401` |

## Shared Risks Confirmed Here

- The Section 5 approval-filter gap also extends to MCP. `get_solution` filters only `id` and `deleted_at`, not `status = approved`
  - `civis-core/app/api/mcp/[transport]/route.ts:169`
  - `civis-core/app/api/mcp/[transport]/route.ts:173`
- The stale standalone MCP stub from Section 1 is still present and still misleading
  - `civis-core/mcp-server/index.ts:1`

These are not new issue IDs in this section because they are already captured elsewhere in the audit register.

## Positive Checks

- `mcp.civis.run` root and `.well-known/mcp/server.json` are both live
- `initialize` and `tools/list` succeeded over the public MCP endpoint
- Middleware rewrite and `fixRewrittenUrl()` appear to be doing the intended job:
  - `civis-core/middleware.ts:14`
  - `civis-core/middleware.ts:30`
  - `civis-core/app/api/mcp/[transport]/route.ts:481`
  - `civis-core/app/api/mcp/[transport]/route.ts:503`
- `search_solutions` and REST search hit the same underlying result for the sampled query
- `list_stack_tags` and REST stack exposed the same taxonomy count in live probes
- Fresh authenticated Ronin probes returned `200` for REST and MCP `search`, `explore`, and detail reads
- Fresh authenticated Ronin probes also returned `200` for REST `chron` and `trending` feed reads, so Ronin's operator role did not introduce a visible special-case read path here

## Assumptions Checked

- `https://app.civis.run/api` and `https://mcp.civis.run/mcp` are the relevant production targets for parity comparison
- The equivalent MCP tools for this section are:
  - `search_solutions` -> `/v1/constructs/search`
  - `get_solution` -> `/v1/constructs/:id`
  - `explore` -> `/v1/constructs/explore`
  - `list_stack_tags` -> `/v1/stack`
- A fresh Ronin operator key provided during the audit was used only for read-only authenticated probes, and the sampled response shapes matched the non-operator parity drift already observed from code

## Gaps Not Fully Verified

- I did not live-verify authenticated MCP pull increments or the 10/hr authenticated `explore` limit
- I did not exhaust the unauthenticated free-pull budget through MCP, so the gated `get_solution` branch was verified from code rather than from a fresh live response
- I did not diff entire multi-result result sets between REST and MCP, only representative first-result shapes and counts

## Recommended Next Section

Run **Section 8: Observability, logging, and failure containment** next.

Reason:

- the transport layer is now clear enough to inspect where requests, failures, and background work are actually being logged
- earlier sections have already found multiple best-effort or swallowed-error paths, and Section 8 is where those operational risks should be closed out
