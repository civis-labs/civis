# Handover: Go-Live Execution

You are picking up the Civis go-live. All code changes are merged to main and deployed. The database still has test data. Your job is to execute the truncation, seeding, and launch sequence.

## Mandatory first steps

1. Read `civis_context.md` (required by CLAUDE.md)
2. Read `docs/GO_LIVE_PLAN.md` for the full checklist (Phases 8-11)
3. Read `docs/SEED_PLAYBOOK.md` for seed script details

## Current state

- **Version:** 0.13.1 (deployed to production on Vercel)
- **Branch:** main is up to date. All UI, security, and feed changes are merged.
- **Supabase:** Upgraded to Pro plan (2026-03-13). Daily backups active. Project URL: `https://lkbesfyfmyczjacqvxso.supabase.co`
- **Database:** Still contains test data from development. Needs full wipe.
- **Alpha gate:** Still active. `ALPHA_PASSWORD` env var on Vercel.
- **Sentry:** Live and configured (Phase 11 item 8 is done).

## What needs to happen, in order

### Step 1: Truncate the database (Phase 8A)

Run this SQL in the Supabase SQL editor. Order matters due to foreign keys:

```sql
-- App data (children first)
TRUNCATE citations CASCADE;
TRUNCATE constructs CASCADE;
TRUNCATE agent_entities CASCADE;
TRUNCATE developers CASCADE;

-- Auth users (Supabase internal tables)
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.identities;
DELETE FROM auth.users;
```

Verify with:
```sql
SELECT 'developers' AS t, count(*) FROM developers
UNION ALL SELECT 'agent_entities', count(*) FROM agent_entities
UNION ALL SELECT 'constructs', count(*) FROM constructs
UNION ALL SELECT 'citations', count(*) FROM citations
UNION ALL SELECT 'users', count(*) FROM auth.users;
```

All counts should be 0. Schema, triggers, functions, and RLS policies are untouched.

### Step 2: Mint Ronin (Phase 9A)

1. User visits `app.civis.run`, logs in with GitHub (`wadyatalkinabewt`)
2. Developer record auto-created with `standard` trust tier (GitHub signals pass)
3. Mint agent passport: **Ronin**
4. Copy UUID and API key (displayed once)

### Step 3: Disable passport trigger, mint Kiri (Phase 9B-9C)

```sql
ALTER TABLE agent_entities DISABLE TRIGGER trg_passport_limit;
```

1. Go to My Agents page, mint second passport: **Kiri**
2. Copy UUID and API key

### Step 4: Re-enable passport trigger (Phase 9D)

```sql
ALTER TABLE agent_entities ENABLE TRIGGER trg_passport_limit;
```

**DO NOT FORGET THIS STEP.** If the trigger stays disabled, any user can mint unlimited agents.

### Step 5: Run seed script (Phase 9E)

The seed script reads JSON build logs from `C:\dev\civis_build_logs\` (3 files: `ronin_real_builds.json`, `ronin_moltbook_posts.json`, `haiku_sdr_builds.json`). It generates OpenAI embeddings, backdates `created_at` per batch, handles duplicate detection, and pins the hero card.

```bash
cd civis-core

# Dry run first
npx tsx scripts/seed.ts --ronin-id <RONIN_UUID> --kiri-id <KIRI_UUID> --dry-run

# Real run
npx tsx scripts/seed.ts --ronin-id <RONIN_UUID> --kiri-id <KIRI_UUID>
```

Expected: 22 logs inserted (18 Ronin + 4 Kiri batch 1-2, 3 Kiri held back for drip), hero card pinned, no failures.

The script uses the Supabase service role key directly (not the API), so trust tier enforcement and rate limits do not apply.

Requires `.env.local` in `civis-core/` with: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.

### Step 6: Trigger reputation refresh (Phase 9G)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://app.civis.run/api/cron/reputation
```

Verify `effective_reputation` updated on both agents in Supabase dashboard or leaderboard.

### Step 7: Visual check (Phase 10A)

- Feed shows build logs with hero card pinned at top
- Explore page shows stack tags
- Leaderboard shows both agents with non-zero reputation
- Search returns relevant results
- Agent profile pages render correctly
- Single build log detail page works
- Marketing pages (`civis.run`, `/about`) look correct
- Mobile spot check (feed, login, agent profile)

### Step 8: Remove alpha gate (Phase 10B)

1. Delete `ALPHA_PASSWORD` env var from Vercel dashboard
2. Redeploy (or wait for auto-deploy)
3. Visit `app.civis.run` in incognito, should load feed without password

### Step 9: Announce (Phase 10C)

- Post on X from `@civis_labs`
- Content templates are in `docs/X_CONTENT_STRATEGY.md`
- Direct outreach to builders (Fred, Delamain, Hazel, QenAI, JeevisAgent)

## Key technical context

- **Feed:** Latest-only (chronological). Trending and Discovery tabs hidden for launch. Re-enable in `components/feed-tabs.tsx` when there's enough organic activity.
- **Pinning:** `pinned_at` column on `constructs`. Sorted first in Latest feed queries. Hero card is "Agent communication safety layer".
- **Reputation cron:** Runs every 30 min via Vercel Cron (`*/30 * * * *`). Can also trigger manually.
- **Embedding text:** title + problem + result only. Solution and code_snippet excluded to avoid OpenAI content filter 500 errors on security-focused logs.
- **Soft-delete:** All construct queries filter `WHERE deleted_at IS NULL`.
- **CSP:** `connect-src` allows `'self'`, `https://*.supabase.co`, `https://*.sentry.io`. Add domains for any new third-party services.
- **Trust tier enforcement:** `POST /v1/constructs` rejects `unverified` developers. Does not affect seed script (uses service role).
- **Auth callback:** Handles "auth user exists but no developer row" gracefully by creating a fresh developer record.

## Rules

- Read `civis_context.md` first (CLAUDE.md requirement)
- Never use em dashes in any output
- Update `CHANGELOG.md` for any code changes
- No code changes unless asked
- User prefers direct, concise communication
