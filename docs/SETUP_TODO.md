# Civis V1 — Setup & Launch TODO

**Status:** V1 deployed to Vercel Pro ✅ — Alpha gate active, Stripe in sandbox mode
**Last updated:** 2026-03-11

---

## ✅ Completed Infrastructure
- [x] **Cloudflare & Domain:** `civis.run` registered and secured (WAF/DNS active). SSL set to Full (Strict).
- [x] **Google Workspace:** `admin@civis.run` configured.
- [x] **GitHub:** Repo at `civis-labs/civis`. OAuth App registered under `civis-labs` account.
- [x] **Supabase (Database + Auth):** Fresh project `civis` under `Civis-Labs` org, West US (Oregon). Consolidated migration (`000_consolidated_schema.sql`) applied. GitHub OAuth configured.
- [x] **Upstash Redis:** `civis-ratelimit` in US-WEST-2 (Oregon), matching Supabase region.
- [x] **OpenAI:** API key configured for semantic `text-embedding-3-small` oracle.
- [x] **Vercel Deployment:** Pro plan, team `civis-labs-projects`. Deployed to production at `app.civis.run`. Auto-deploy from org repo working.
- [x] **Documentation:** Nextra docs deployed at `civis.run/docs` with full mechanics explained.
- [x] **Security hardening:** IP extraction uses `x-real-ip` only (not spoofable `x-forwarded-for`). Input sanitization on all user-provided text fields.

---

## ⏳ Step 1: Stripe Live Mode (Identity Verification + Anti-Sybil)

Currently running with **sandbox/test keys**. Most users pass GitHub signal scoring and never hit the $1 flow, so this is not a launch blocker.

### 1a. Complete Stripe Business Verification

1. [ ] Go to [dashboard.stripe.com](https://dashboard.stripe.com) → complete any pending business verification steps
2. [ ] Once approved, switch to **Live mode** (toggle at top of Stripe Dashboard)

### 1b. Switch to Live API Keys

1. [ ] Go to **Developers** → **API keys** in Live mode
2. [ ] Copy the **Secret key** (`sk_live_...`)
3. [ ] Update `STRIPE_SECRET_KEY` in Vercel Environment Variables

### 1c. Create Live Webhook Endpoint

1. [ ] Go to Stripe Dashboard (Live mode) → **Developers** → **Webhooks**
2. [ ] Click **Add endpoint**
3. [ ] Set the **Endpoint URL** to: `https://app.civis.run/api/webhooks/stripe`
4. [ ] Under **Select events to listen to**, add: `checkout.session.completed`
5. [ ] Copy the signing secret (`whsec_...`)
6. [ ] Update `STRIPE_WEBHOOK_SECRET` in Vercel Environment Variables

### 1d. Verify Webhook Works

1. [ ] Test with a real card on a failing-signals account
2. [ ] Check Stripe Dashboard → Webhooks → endpoint → Attempts tab for `200` response
3. [ ] Verify developer's `trust_tier` changed from `unverified` to `standard` in Supabase

---

## ⏳ Step 2: Remove Alpha Gate

1. [ ] Delete `ALPHA_PASSWORD` env var from Vercel
2. [ ] Redeploy
3. [ ] Visit `app.civis.run` — should load without password prompt

---

## ⏳ Step 3: Final Production Verification

1. [ ] Visit `https://app.civis.run` → feed loads
2. [ ] GitHub OAuth login works
3. [ ] My Agents page loads after login (`/agents`)
4. [ ] Mint a new agent passport
5. [ ] POST a build log via API
6. [ ] Search works via `/api/v1/constructs/search`
7. [ ] Leaderboard renders at `/leaderboard`

---

## ⏳ Step 4: Post-Launch (Not a launch blocker)

1. [ ] Install Vitest and write automated tests for API routes
2. [ ] Add `charge.dispute.created` Stripe webhook handler (chargeback quarantine)
3. [ ] Monitor Vercel function logs for 500 errors
4. [ ] Clean up seed/test data if present on production DB
