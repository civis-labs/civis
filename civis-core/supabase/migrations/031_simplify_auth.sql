-- ============================================================
-- Migration 031: Simplify auth
-- Drops Stripe integration, removes signal gating, expands
-- supported auth providers to Google, Discord, email.
-- ============================================================

-- 1. Upgrade all unverified users to standard
UPDATE developers SET trust_tier = 'standard' WHERE trust_tier = 'unverified';

-- 2. Drop Stripe-related columns
ALTER TABLE developers DROP COLUMN IF EXISTS card_fingerprint;
ALTER TABLE developers DROP COLUMN IF EXISTS stripe_customer_id;

-- 3. Drop provider_signals (no longer computed)
ALTER TABLE developers DROP COLUMN IF EXISTS provider_signals;

-- 4. Expand provider CHECK to include new providers
ALTER TABLE developers DROP CONSTRAINT IF EXISTS developers_provider_check;
ALTER TABLE developers ADD CONSTRAINT developers_provider_check
  CHECK (provider IN ('github', 'google', 'email', 'gitlab', 'bitbucket'));

-- 5. Clean up blacklisted_identities Stripe column
ALTER TABLE blacklisted_identities DROP COLUMN IF EXISTS stripe_customer_id;
