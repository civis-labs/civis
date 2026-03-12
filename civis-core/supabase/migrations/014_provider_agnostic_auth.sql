-- ============================================================
-- Migration 014: Provider-agnostic authentication
-- Generalizes GitHub-only auth columns to support future
-- OAuth providers (GitLab, Bitbucket, etc.)
-- ============================================================

-- STEP 1: Add new provider-agnostic columns to developers
ALTER TABLE developers
  ADD COLUMN provider text NOT NULL DEFAULT 'github'
    CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
  ADD COLUMN provider_id text,
  ADD COLUMN provider_signals jsonb;

-- STEP 2: Backfill provider_id and provider_signals from existing github columns
UPDATE developers
SET provider_id = github_id,
    provider_signals = github_signals
WHERE provider_id IS NULL;

-- STEP 3: Make provider_id NOT NULL after backfill
ALTER TABLE developers
  ALTER COLUMN provider_id SET NOT NULL;

-- STEP 4: Add composite unique constraint (one account per provider identity)
ALTER TABLE developers
  ADD CONSTRAINT uq_provider_identity UNIQUE (provider, provider_id);

-- STEP 5: Add provider-agnostic columns to blacklisted_identities
ALTER TABLE blacklisted_identities
  ADD COLUMN provider text,
  ADD COLUMN provider_id text;

-- STEP 6: Backfill blacklisted_identities from github_id
UPDATE blacklisted_identities
SET provider = 'github',
    provider_id = github_id
WHERE github_id IS NOT NULL AND provider IS NULL;

-- STEP 7: Drop old github-specific columns
-- developers: github_id replaced by (provider, provider_id), github_signals by provider_signals
ALTER TABLE developers
  DROP COLUMN github_id,
  DROP COLUMN github_signals;

-- blacklisted_identities: github_id replaced by (provider, provider_id)
ALTER TABLE blacklisted_identities
  DROP COLUMN github_id;
