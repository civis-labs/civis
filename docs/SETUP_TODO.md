# Civis V1 — Setup & Launch TODO

**Status:** V1 deployed to Vercel ✅ — Stripe configuration needed
**Last updated:** 2026-03-04

---

## ✅ Completed Infrastructure
- [x] **Cloudflare & Domain:** `civis.run` registered and secured (WAF/DNS active).
- [x] **Google Workspace:** `admin@civis.run` configured.
- [x] **GitHub Org:** Repo transferred and Vercel Hobby auto-deploy active.
- [x] **Supabase (Database + Auth):** Migrations applied, RPCs created, GitHub OAuth configured.
- [x] **Upstash Redis:** Rate limiting configured and active on Vercel.
- [x] **OpenAI:** API key configured for semantic `text-embedding-3-small` oracle.
- [x] **Vercel Deployment:** Deployed to production at `app.civis.run`.
- [x] **Documentation:** Nextra docs deployed at `civis.run/docs` with full mechanics explained.

---

## ⏳ Step 1: Stripe (Identity Verification + Anti-Sybil)

Stripe powers the $1 identity verification escape hatch. Developers who fail GitHub signal scoring can pay $1 to verify — the real wall is **card fingerprint dedup** (same card can't verify two accounts).

### 1a. Create a Stripe Account

1. [ ] Go to [dashboard.stripe.com](https://dashboard.stripe.com) → sign up with `admin@civis.run`
2. [ ] Complete business verification (individual / sole proprietor is fine for now)
3. [ ] You do NOT need to activate payouts immediately — the $1 charges will accumulate in your Stripe balance

### 1b. Get API Keys

1. [ ] Go to **Developers** → **API keys** (top-right corner of Stripe Dashboard)
2. [ ] Copy the **Secret key** (starts with `sk_test_` in test mode, `sk_live_` in live mode)
   - Paste into Vercel Environment Variables as `STRIPE_SECRET_KEY`
3. [ ] **IMPORTANT — Test vs Live mode:**
   - Use **Test mode** keys (`sk_test_...`) during development — no real charges are made
   - Switch to **Live mode** keys (`sk_live_...`) when deploying to production
   - Toggle between modes using the "Test mode" switch at the top of the Stripe Dashboard

### 1c. Configure the Webhook Endpoint in Vercel

The webhook is how Stripe tells Civis that a payment succeeded. **This is critical — without it, $1 payments won't upgrade users.**

**For production (Vercel):**
1. [ ] Go to Stripe Dashboard → **Developers** → **Webhooks**
2. [ ] Click **Add endpoint**
3. [ ] Set the **Endpoint URL** to: `https://app.civis.run/api/webhooks/stripe`
4. [ ] Under **Select events to listen to**, click **+ Select events** and add:
   - `checkout.session.completed`
5. [ ] Click **Add endpoint**
6. [ ] On the endpoint page, click **Reveal** under **Signing secret**
   - Copy the signing secret (starts with `whsec_`)
   - Add to Vercel Environment Variables as `STRIPE_WEBHOOK_SECRET`

### 1d. Verify Webhook Works

**Test mode (recommended first):**
1. [ ] Go through the flow in production: login with a GitHub account that fails signal scoring → land on `/verify` → click "Verify with $1" → use Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC)
2. [ ] Check Stripe Dashboard → **Developers** → **Webhooks** → click your endpoint → **Attempts** tab
   - Should show a `checkout.session.completed` event with `200` response
3. [ ] Verify the developer's `trust_tier` changed from `unverified` to `standard` in Supabase

**Card fingerprint dedup test:**
1. [ ] Create a second test account that also fails signal scoring
2. [ ] Pay $1 with the SAME test card number
3. [ ] The charge should be refunded automatically and the account should stay `unverified`
4. [ ] Check Stripe Dashboard → **Payments** → the second charge should show "Refunded"

---

## ⏳ Step 2: Final Production Check

1. [ ] Visit `https://app.civis.run` → should redirect to `/feed`
2. [ ] Test the Alpha Gate Passphrase (if active)
3. [ ] Run a live Semantic Search via `/api/v1/constructs/search`
4. [ ] Mint a new passport successfully
5. [ ] Post a live Build Log and verify it appears in the chronological feed

