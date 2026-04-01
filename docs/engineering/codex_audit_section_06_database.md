# Codex Audit Section 06

**Section:** 6. Database schema, migrations, and RPC correctness
**Date:** 2026-04-02
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- The live SQL contract is only partially represented by the repo bootstrap story.
- The biggest database-level risk is migration hygiene: `000_consolidated_schema.sql` no longer reproduces the schema the app expects.
- The main correctness gap inside the current SQL layer is that some helper RPCs still ignore construct approval status even though the main public feed/search/explore RPCs were tightened in migration `028`.

## Commands Run

- Read: `civis-core/supabase/migrations/000_consolidated_schema.sql`
- Read: `civis-core/supabase/migrations/022_api_request_logs.sql`
- Read: `civis-core/supabase/migrations/023_feed_performance.sql`
- Read: `civis-core/supabase/migrations/024_strategy_v2_schema.sql`
- Read: `civis-core/supabase/migrations/025_increment_pull_count.sql`
- Read: `civis-core/supabase/migrations/026_explore_rpc.sql`
- Read: `civis-core/supabase/migrations/028_status_filters.sql`
- Read: `civis-core/supabase/migrations/030_remove_citations_reputation.sql`
- Read: `civis-core/supabase/migrations/031_simplify_auth.sql`
- Read: `civis-core/supabase/migrations/033_drop_credential_tag.sql`
- Read: `civis-core/supabase/migrations/034_fix_discovery_feed.sql`
- Searched current RPC call sites and schema dependencies with `rg`
- Read dependent app code:
  - `civis-core/lib/api-logger.ts`
  - `civis-core/app/feed/page.tsx`
  - `civis-core/app/feed/explore/page.tsx`
  - `civis-core/app/feed/admin/page.tsx`
  - `civis-core/app/api/internal/feed/route.ts`
  - `civis-core/app/api/internal/tag-counts/route.ts`

## Findings

### AUD-023: The consolidated schema file is no longer a faithful bootstrap

**Severity:** High

The bootstrap file says:

- `civis-core/supabase/migrations/000_consolidated_schema.sql:3`
- `civis-core/supabase/migrations/000_consolidated_schema.sql:4`

but it is behind the migration-applied schema in at least two concrete ways:

1. It still defines the pre-`034` discovery-feed logic:

- `civis-core/supabase/migrations/000_consolidated_schema.sql:305`

while the current migration history has replaced that with the low-pull "hidden gems" version:

- `civis-core/supabase/migrations/034_fix_discovery_feed.sql:1`

2. It does not include the `api_request_logs` table or retention setup from:

- `civis-core/supabase/migrations/022_api_request_logs.sql:6`

even though the current app depends on that table in:

- `civis-core/app/feed/admin/page.tsx:38`
- `civis-core/app/api/internal/feed/route.ts:67`
- `civis-core/app/feed/page.tsx:41`

This means a fresh environment created from `000_consolidated_schema.sql` will not match the schema expected by the checked-out app or by production.

### AUD-024: The repo never migrates `api_request_logs.authenticated`

**Severity:** Medium

The tracked logging-table migration defines:

- `civis-core/supabase/migrations/022_api_request_logs.sql:6`
- `civis-core/supabase/migrations/022_api_request_logs.sql:14`

There is no tracked migration adding an `authenticated` column afterward.

But the current logger writes it on every insert:

- `civis-core/lib/api-logger.ts:28`
- `civis-core/lib/api-logger.ts:35`

Because the logger swallows errors, a repo-defined database without that column would silently drop API request telemetry instead of failing loudly. If production already has the column, that would mean the repo is missing a schema migration and cannot fully reproduce the deployed database.

### AUD-025: `get_tag_counts` and `get_platform_stats` still ignore approval status

**Severity:** Medium

Migration `028` explicitly tightened the main feed/search RPCs to `status = 'approved'`:

- `civis-core/supabase/migrations/028_status_filters.sql:1`

But the helper RPCs left in the consolidated schema still count all non-deleted constructs:

- `civis-core/supabase/migrations/000_consolidated_schema.sql:340`
- `civis-core/supabase/migrations/000_consolidated_schema.sql:359`

Current app code consumes `get_tag_counts` in live user-facing and internal surfaces:

- `civis-core/app/feed/page.tsx:60`
- `civis-core/app/feed/explore/page.tsx:37`
- `civis-core/app/api/internal/tag-counts/route.ts:20`

So even after the public feed, search, and explore routes were hardened against non-approved content, tag counts can still be influenced by pending or rejected rows if those rows exist.

I did not find any current runtime consumer of `get_platform_stats`, so that half of the mismatch is a latent risk rather than an observed UI bug.

## RPC Review

### `search_constructs`

- Current SQL in `030` correctly filters `deleted_at IS NULL` and `status = 'approved'`
- The route and MCP both rely on it
- No schema-level correctness issue beyond the earlier fail-open handling in the API route

### `get_trending_feed`

- Current SQL filters approved and deleted rows
- Pinned ordering is preserved
- No migration-level correctness issue found in the current definition

### `get_discovery_feed`

- Current SQL in `034` matches the post-citations product model
- The main issue is migration hygiene: the consolidated bootstrap still ships the obsolete pre-`034` definition

### `explore_constructs`

- Current SQL correctly filters approved and deleted rows
- Returns `display_name` as part of its contract
- The mismatch found in Section 5 is at the route layer, not the SQL layer

### `increment_pull_count`

- `increment_pull_count` remains a single-statement atomic update:
  - `civis-core/supabase/migrations/025_increment_pull_count.sql:5`
- That part of the pull-count contract is sound

## Migration Hygiene Notes

- The repo now has three schema narratives:
  - archived historical migrations under `archive/`
  - the live linear migrations `013` through `034`
  - the supposedly complete `000_consolidated_schema.sql`
- `000_consolidated_schema.sql` is no longer aligned with the live linear migrations
- Because some app code uses service-role queries directly against tables and RPCs, schema drift here is not academic. It changes actual runtime behavior

## Positive Checks

- The active search, trending, discovery, and explore RPCs all now include approval filtering in the tracked migration history
- `increment_pull_count` is still the right primitive for atomic pull updates
- `034_fix_discovery_feed.sql` is now committed, so the repo at least contains the intended current discovery-feed SQL

## Assumptions Checked

- The app’s current SQL dependencies are the RPCs and tables referenced directly from checked-in code, not undocumented dashboard-only objects
- `000_consolidated_schema.sql` is intended to be used for fresh setup because it explicitly says so at the top of the file
- Missing tracked migrations should be treated as real reproducibility risks even if production happens to have matching manual changes

## Gaps Not Fully Verified

- I could not query the live database schema directly, so I cannot prove whether production currently has an out-of-band `api_request_logs.authenticated` column
- I did not benchmark query plans or index usage, so this pass focused on correctness and reproducibility, not SQL performance tuning
- I did not reconstruct a database from scratch locally, so the bootstrap-drift finding is based on tracked SQL comparison rather than a full apply test

## Follow-Up SQL Tests

- Rebuild a fresh local Supabase schema from `000_consolidated_schema.sql` and compare it against a schema built by replaying tracked migrations `013` through `034`
- Add a regression test that inserts a non-approved construct and confirms:
  - `search_constructs`, `get_trending_feed`, `get_discovery_feed`, and `explore_constructs` exclude it
  - `get_tag_counts` and `get_platform_stats` either exclude it or are intentionally documented otherwise
- Add a schema test for `api_request_logs` inserts that includes the `authenticated` field the app logger writes

## Recommended Next Section

Run **Section 7: MCP transport and REST parity** next.

Reason:

- the SQL layer is now understood well enough to compare REST and MCP behavior without mixing in database uncertainty
- earlier sections already exposed route-level drift on auth and public read shapes, and Section 7 is the place to close that parity question
