# Civis Go-Live Plan (Detailed)

## Context

V1 MVP is feature-complete behind alpha gate at `app.civis.run`. Stripe $1 identity verification tested successfully in sandbox mode. Consolidated migration created. Repo transferred to `civis-labs/civis`. Vercel upgraded to Pro plan. Fresh Supabase project running in Oregon.

**Goal:** Launch publicly ASAP.

**Session resilience:** Each phase has explicit "done when" criteria and file paths so any future session can verify completion and pick up where this left off.

---

## Phase 1: Code Fixes (Rate Limit + last_login_at)

**Status:** DONE (2026-03-11)
**Version:** 0.10.2

### Completed
- Rate limit on `/api/stripe/checkout` (5 req/hour per user via sliding window)
- `last_login_at` tracked on every login (both new and returning users)
- CHANGELOG updated

---

## Phase 2: Consolidated Migration

**Status:** DONE (2026-03-11)
**Version:** 0.10.2

### Completed
- Created `000_consolidated_schema.sql` — single SQL file with all 7 tables, indexes, triggers, 12 RPC functions, and RLS policies
- Archived 12 original migrations to `supabase/migrations/archive/`
- Includes 3 new columns: `last_login_at` (developers), `quarantined_at` (agent_entities), `deleted_at` (constructs)
- Added correction citation daily cap trigger, GIN index on `payload->'stack'`

---

## Phase 3: Infra Migration (Vercel Pro + Repo Transfer)

**Status:** DONE (2026-03-11)

### Completed
- Vercel upgraded to Pro plan (team `civis-labs-projects`)
- Repo transferred: `wadyatalkinabewt/civis` → `civis-labs/civis`
- Custom domains (`civis.run`, `app.civis.run`, `www.civis.run`) attached and working
- Auto-deploy from org repo working on Pro plan
- All env vars re-configured
- Cron job visible in Vercel dashboard

---

## Phase 4: Fresh Supabase + Run Migration

**Status:** DONE (2026-03-11)

### Completed
- New Supabase project `civis` created under `Civis-Labs` org in West US (Oregon)
- Project URL: `https://lkbesfyfmyczjacqvxso.supabase.co`
- Consolidated migration ran successfully — all 7 tables, indexes, functions present
- GitHub OAuth provider configured on new project
- Vercel env vars updated with new Supabase credentials
- Site loads and GitHub OAuth login works

---

## Phase 5: Stripe Live Mode

**Status:** DONE (2026-03-11) — launched with sandbox Stripe

### Completed
- Decision made to launch with sandbox/test keys (`sk_test_...`)
- Most users pass GitHub signal scoring (3/4 threshold) and never hit the $1 flow
- Will switch to live Stripe keys when business verification is approved

### Remaining
- [ ] Complete Stripe business verification
- [ ] Switch to live mode keys (`sk_live_...`) and create live webhook endpoint
- [ ] Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Phase 6: Go Live + Full Smoke Test

**Status:** DONE (2026-03-11)

### Completed
- Alpha gate still active (will be removed when ready to go public)
- Smoke test passed:
  - [x] Build log POST via API works
  - [x] Semantic search returns results
  - [x] Leaderboard renders
  - [x] `last_login_at` populated in Supabase
  - [x] GitHub OAuth login creates developer record

### Remaining (pre-public)
- [ ] Remove `ALPHA_PASSWORD` env var from Vercel to go public
- [ ] Clean up test/seed data if needed

---

## Phase 7: Post-Launch (first 48h, NOT a launch blocker)

**Status:** NOT STARTED
**Who:** Claude + User
**Time:** Ongoing

1. **Automated test suite** — Install Vitest, write tests for API routes and lib functions
2. **Chargeback webhook** — Add `charge.dispute.created` handler that sets `quarantined_at` on agent_entities
3. **Monitor** Vercel function logs for 500 errors
4. **Monitor** Stripe dashboard for first live payment

---

## Additional Changes Made During Go-Live (2026-03-11)

These changes were made during the go-live session but weren't part of the original plan:

### Security Hardening (v0.10.3 → v0.10.4)
- Removed spoofable `x-forwarded-for` from IP extraction in all 11 API routes (now `x-real-ip` only)
- Added `sanitizeString()` to citation rejection reason field

### Auth Callback Fixes (v0.10.4)
- Fixed origin resolution to use `x-forwarded-host`/`x-forwarded-proto` (fixes localhost OAuth)
- Fixed redirect paths from `/login` to `/feed/login` (internal) / `/login` (clean URL)
- All redirects now use clean URLs (no `/feed` prefix visible in browser)

### Route Rename (v0.10.4)
- Renamed `/console` → `/agents` across 17 references
- Browser URL shows `app.civis.run/agents` (middleware handles `/feed` prefix internally)

### Infrastructure
- Upstash Redis migrated from Sydney (AP-SOUTHEAST-2) to Oregon (US-WEST-2) to match Supabase region

---

## Quick Reference: All Env Vars Needed

| Variable | Source | Notes |
|----------|--------|-------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project settings | Public |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase project settings | Public |
| SUPABASE_SERVICE_ROLE_KEY | Supabase project settings | Secret |
| OPENAI_API_KEY | OpenAI dashboard | Secret |
| UPSTASH_REDIS_REST_URL | Upstash console (Oregon) | Public |
| UPSTASH_REDIS_REST_TOKEN | Upstash console (Oregon) | Secret |
| CRON_SECRET | Self-generated (any random string) | Secret |
| STRIPE_SECRET_KEY | Stripe dashboard → API keys | Secret |
| STRIPE_WEBHOOK_SECRET | Stripe dashboard → Webhooks → endpoint | Secret |
| ALPHA_PASSWORD | Self-set (removed at go-live) | Secret, optional |
