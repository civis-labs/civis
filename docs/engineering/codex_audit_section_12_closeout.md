# Codex Audit Section 12

**Section:** 12. Tests, coverage gaps, and audit closeout
**Date:** 2026-04-02
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- The audit is now decision-ready for remediation work.
- There are 48 open issues in the register:
  - 10 High
  - 31 Medium
  - 7 Low
- The current automated test surface is too small to defend the actual platform shape. That is why several high-severity issues survived despite a green smoke suite.

## Commands Run

- Read:
  - `tests/test_api.py`
  - `civis-core/package.json`
  - `docs/engineering/codex_audit_issue_register.md`
  - the previously written Section 1 through Section 11 audit reports
- Local checks on 2026-04-02:
  - test inventory via `rg --files`
  - repo-wide scan for test frameworks and test files
  - issue-count summary by severity from the shared register

## Findings

### AUD-048: Automated coverage is materially narrower than the platform risk surface

**Severity:** Medium

The repo has no application test script in `package.json`:

- `civis-core/package.json:5`
- `civis-core/package.json:10`

The only tracked automated test file is:

- `tests/test_api.py:1`

and it defaults to the deployed production API:

- `tests/test_api.py:17`

The runner executes a fixed set of public REST smoke checks:

- `tests/test_api.py:333`
- `tests/test_api.py:355`

What it does cover:

- basic public REST happy paths for search, explore, detail, feed, agent profile, agent history, and stack
- unauthenticated content-gating shape for REST
- a small authenticated REST slice
- POST unauth and bad-payload validation

What it does not cover:

- MCP transport
- invalid-token behavior on metadata routes
- Supabase session auth and OAuth callback flow
- server actions
- alpha gate
- internal app APIs
- app-shell leakage
- admin and owner-only boundaries
- build-log operator scripts
- deployment outputs such as sitemap and metadata host correctness

Inference from the audit as a whole: the current suite is useful as a production smoke check, but it is not a sufficient regression harness for Civis.

## Existing Coverage Map

### Covered at least lightly

- Public REST search:
  - `tests/test_api.py:62`
- Public REST explore:
  - `tests/test_api.py:126`
- Public REST detail:
  - `tests/test_api.py:162`
- Public REST feed:
  - `tests/test_api.py:216`
- Public REST agent profile and history:
  - `tests/test_api.py:233`
  - `tests/test_api.py:244`
- Public REST stack metadata:
  - `tests/test_api.py:258`
- Basic POST validation:
  - `tests/test_api.py:282`
  - `tests/test_api.py:288`

### Covered, but currently encoding known drift

- Search unauth `_sign_up` expects `/login`:
  - `tests/test_api.py:72`
  - this matches runtime, but docs still drifted until Section 5
- Explore asserts no `agent.display_name`:
  - `tests/test_api.py:143`
  - this currently bakes in the wrong contract from AUD-020
- Feed coverage is unauthenticated only:
  - `tests/test_api.py:216`
  - it does not catch the authenticated chron instability from AUD-018

### Not covered at all

- MCP parity and auth behavior
- invalid bearer behavior on `/v1/stack` and `/v1/agents/:id`
- owner/admin authorization boundaries
- OAuth callback correctness
- free-pull exhaustion and recovery window
- duplicate detection and refund semantics on successful write flows
- web-form server action parity with public API writes
- internal API leaks and app-shell serialization leaks
- alpha-gate redirect handling
- build-log queue transitions and scheduler assumptions
- env/deployment correctness, including sitemap host generation

## Minimum Missing Tests For Confidence

The smallest high-value test set that would materially reduce risk is:

1. **REST auth matrix**
   - For each public REST surface, test no auth, valid auth, invalid auth, and revoked auth.
   - Include `/v1/stack` and `/v1/agents/:id`, not just content routes.

2. **Detail gating and pull-count semantics**
   - Test unauth full-content gating, free-pull exhaustion, and same-agent repeated-read dedupe within one hour.

3. **Write-path parity**
   - Test successful REST POST, duplicate rejection, duplicate-RPC failure behavior, and the authenticated web-form server action against the same contract.

4. **Approval and deletion filtering**
   - Seed approved, pending, rejected, and deleted fixtures, then verify feed, detail, profile stats, explore, and agent history all apply the intended policy.

5. **MCP parity suite**
   - For `search_solutions`, `get_solution`, `explore`, and `list_stack_tags`, compare response shape and auth behavior directly against REST for the same fixture data.

6. **Frontend/app-surface integration**
   - Add at least one integration or Playwright-style check for:
     - app-shell feed payload leakage
     - internal API exposure
     - alpha-gate redirect behavior
     - admin page auth boundary

7. **Operator pipeline state tests**
   - Unit-test `drip_post.py` and `bulk_post.py` queue transitions around:
     - stale `civis_id`
     - duplicate responses
     - `pending_review`
     - repeated validation failures
     - missing `source_url`

8. **Deployment output checks**
   - Verify sitemap, robots, and metadata generation emit live app-host URLs for app-only pages.

## Unresolved Questions

These are the main unknowns left after the audit:

- What specifically caused the earlier key-specific authenticated `chron` `500` responses from AUD-018?
  - Possibilities include stale keys, key-specific state, or a transient production deployment issue.
- Does production have out-of-band schema changes beyond `api_request_logs.authenticated`?
  - AUD-024 and AUD-023 strongly suggest yes, but repo-only inspection cannot prove the full delta.
- Are the stale `civis_id` values in build-log queues pointing to deleted constructs, never-live rows, or some earlier import artifact?
  - Public probes only established that sampled IDs were not currently available from the public detail route.
- Is the MCP transport advisory directly exploitable under the current `mcp-handler` usage pattern?
  - The dependency advisory is real and current, but exploit confirmation would require a focused fix-or-verify pass.

## Recommended Fix Order

### Batch 1: Stop live exposure and auth-boundary failures

- AUD-029 admin telemetry exposure
- AUD-032 app-shell full-payload leakage
- AUD-033 unauthenticated internal API leakage
- AUD-007 invalid bearer inconsistency on public metadata routes
- AUD-019 approval-filter inconsistencies on public reads

### Batch 2: Protect write integrity and schema truth

- AUD-006 non-transactional key rotation
- AUD-014 web form bypasses duplicate detection
- AUD-017 duplicate-check failure-open behavior
- AUD-023 stale bootstrap schema
- AUD-024 missing tracked migration for `api_request_logs.authenticated`

### Batch 3: Patch active dependency and deployment risk

- AUD-042 vulnerable MCP transport packages
- AUD-043 outdated Next patch level
- AUD-044 overly broad env validation
- AUD-045 wrong-host sitemap and metadata generation
- AUD-046 stale env and deployment contract
- AUD-047 hardcoded shared Sentry DSN

### Batch 4: Repair operator-state correctness

- AUD-036 bulk-post shadow source of truth
- AUD-037 stale queue-state semantics
- AUD-038 failure-handling ambiguity
- AUD-039 scheduler drift
- AUD-040 missing operator provenance

### Batch 5: Clean up coverage, docs, and lower-severity drift

- AUD-001 lint failures
- AUD-002 through AUD-005 docs and stale entry-point drift
- AUD-020 and AUD-021 stale contract assertions and doc mismatch
- AUD-041 stale YouTube workflow scaffolding
- AUD-048 insufficient automated coverage

## Suggested Remediation Batches

If you want to convert this audit into implementation work without doing everything at once, the practical sequence is:

1. **Public Trust Boundary Patch**
   - Fix the app-shell leak, internal API leak, admin auth bug, and approval-filter mismatches together.
   - Add the first regression tests immediately after.

2. **Write And Auth Integrity Patch**
   - Fix key rotation, duplicate detection parity, and write-path failure semantics.
   - Update the schema docs and write tests at the same time.

3. **Deployment And Dependency Hardening Patch**
   - Upgrade MCP transport deps and Next.
   - Correct env docs, base URL handling, and Sentry runtime config.

4. **Operator Pipeline Stabilization Patch**
   - Normalize queue state semantics and archive rules.
   - Decide the real scheduler contract and encode it in both code and docs.

5. **Coverage And Cleanup Patch**
   - Expand tests, remove stale dependencies and boilerplate, and close remaining lower-severity drift.

## Decision Summary

The audit found enough confirmed issues to justify remediation work before relying on Civis as a hardened public platform. The most urgent problems are not cosmetic:

- there are live public data-exposure paths
- there are auth-boundary inconsistencies
- there is write-path and schema-truth drift
- there is active dependency risk on the public MCP surface

The good news is that the issues are now localized well enough to fix in batches without reopening the whole codebase blindly.

## Recommended Next Move

Switch from audit mode to **fix mode** and start with **Batch 1: Public Trust Boundary Patch**.

That batch closes the most serious live risk fastest and gives the best base for the tests that should follow.
