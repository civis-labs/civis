# Codex Audit Section 01

**Section:** 1. Baseline and drift inventory
**Date:** 2026-04-01
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- Worktree baseline is clean: `git status --short` returned no tracked or untracked changes.
- Route and module inventory snapshot:
  - API files: 16
  - Library files: 17
  - Feed files: 33
  - Migration files: 35
- Local quality gate is not clean. `npm run lint` fails with 8 errors and 4 warnings.
- Public smoke coverage is green, but only against the deployed API. `python tests/test_api.py` passed 75/75 against `https://app.civis.run/api`.

## Commands Run

- `git status --short`
- `npm run lint` in `civis-core`
- `python tests/test_api.py`
- Route/module inventory using `rg --files` counts
- Targeted file inspections for `docs/engineering/TODO.md`, `build_logs/CLAUDE.md`, `civis-core/mcp-server/index.ts`, `civis-core/app/api/mcp/[transport]/route.ts`, and `tests/test_api.py`

## Findings

### AUD-001: Local lint gate fails in high-touch flows

**Severity:** High

`npm run lint` currently fails in several user-facing or operator-facing areas:

- `civis-core/app/feed/admin/page.tsx:25` calls `Date.now()` during render
- `civis-core/app/feed/agent/[id]/owner-controls.tsx:51` synchronizes form state from props via direct `setState` inside effects, repeated at lines 54 and 57
- `civis-core/app/feed/agents/new-key/client.tsx:39` sets state directly inside an effect
- `civis-core/components/feed-client.tsx:46` sets state directly inside an effect for the debug banner path
- `civis-core/app/(marketing)/page.tsx:158` contains invalid JSX comment text
- `civis-core/app/docs/[[...mdxPath]]/page.tsx:29` still uses `any`

This is both a maintainability problem and a signal that some critical UI flows are carrying real behavior risk. Section 9 should triage which lint failures correspond to runtime bugs versus cleanup debt.

### AUD-002: Smoke tests pass remotely, not locally

**Severity:** Medium

`tests/test_api.py` defaults to the deployed base URL:

- `tests/test_api.py:17` sets `BASE = "https://app.civis.run/api"`
- `tests/test_api.py:317` only changes that when `--base` is provided

The current green smoke run proves production is up and broadly healthy, but it does not validate the checked-out code unless the runner overrides `--base` to a local or preview deployment.

### AUD-003: Stale MCP stub conflicts with the real implementation

**Severity:** Medium

`civis-core/mcp-server/index.ts:1` still declares the MCP server a stub and says implementation is deferred, but the actual MCP server is already implemented in `civis-core/app/api/mcp/[transport]/route.ts` using `createMcpHandler` and `withMcpAuth`, with live tools registered at lines 59, 139, 264, and 351.

This is not a runtime bug by itself, but it is clear maintenance drift and can cause future contributors to edit or trust the wrong entry point.

### AUD-004: Engineering TODO is stale on MCP status

**Severity:** Medium

`docs/engineering/TODO.md:5` still lists "MCP server build-out: add explore tool" as open work. That no longer matches the current code, which already registers an `explore` MCP tool at `civis-core/app/api/mcp/[transport]/route.ts:264`.

This is process/documentation drift rather than runtime breakage, but it undermines the TODO board as a source of truth.

### AUD-005: `build_logs` operator docs still describe removed data model pieces

**Severity:** Medium

`build_logs/CLAUDE.md` still includes old reputation and schema guidance:

- `build_logs/CLAUDE.md:194` documents a `citations` field even though citations were removed from the platform
- `build_logs/CLAUDE.md:266` says pull counts are live queries on a `pulls table`, which no longer matches the denormalized `pull_count` model

This raises the risk of operator error during manual curation, cleanup, or script maintenance.

## Assumptions Checked

- The repo is currently in a clean baseline state for audit execution
- The deployed public API is reachable and generally healthy for unauthenticated smoke coverage
- The current section is limited to baseline and drift inventory only, not deep auth or data-layer review

## Gaps Not Fully Verified

- Authenticated API branches were not smoke-tested in this pass because no API key was supplied to `tests/test_api.py`
- The local app was not booted for interactive UI verification in this section
- MCP transport was inspected statically, not exercised end-to-end over the network in this section
- SQL behavior and migration correctness are deferred to Section 6

## Recommended Next Section

Run **Section 2: Authentication, session, and credential lifecycle** next.

Reason:
- It is the highest-risk service boundary after baseline
- It will validate REST, server action, Supabase session, and MCP auth assumptions before deeper endpoint review
- Several later sections depend on getting auth and ownership boundaries right first
