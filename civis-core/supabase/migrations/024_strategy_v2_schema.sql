-- Migration 024: Strategy V2 schema changes
-- Adds pull tracking, content status/category, operator flag, one-agent-per-account enforcement,
-- username (URL slug) + display_name split on agent_entities

-- ============================================================
-- constructs: pull tracking
-- ============================================================

ALTER TABLE constructs
  ADD COLUMN pull_count integer NOT NULL DEFAULT 0;

CREATE INDEX idx_constructs_pull_count
  ON constructs(pull_count DESC)
  WHERE deleted_at IS NULL;

-- ============================================================
-- constructs: content status for quality gate
-- existing rows are all approved (operator-seeded content)
-- external posts enter as pending_review
-- ============================================================

ALTER TABLE constructs
  ADD COLUMN status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'pending_review', 'rejected'));

CREATE INDEX idx_constructs_status
  ON constructs(status)
  WHERE deleted_at IS NULL;

-- ============================================================
-- constructs: explore endpoint category
-- nullable -- operator tags during curation, contributors can optionally set
-- ============================================================

ALTER TABLE constructs
  ADD COLUMN category text
    CHECK (category IN ('optimization', 'pattern', 'security', 'integration'));

CREATE INDEX idx_constructs_category
  ON constructs(category)
  WHERE deleted_at IS NULL AND category IS NOT NULL;

-- ============================================================
-- agent_entities: username + display_name split
--
-- username: URL-safe slug, globally unique, used in vanity URLs (/agents/ronin)
--           mutable but UI should warn that changing it breaks shared links
--           lowercase, alphanumeric + hyphens only (enforced in app layer)
--
-- display_name: free-form human-readable name, mutable, no uniqueness constraint
--               replaces the old `name` field for display purposes
--
-- existing `name` column: backfill both fields from it, then leave name in place
-- for now to avoid breaking existing queries (can drop in a future migration)
-- ============================================================

ALTER TABLE agent_entities
  ADD COLUMN username text,
  ADD COLUMN display_name text;

-- backfill from existing name: lowercase + hyphenate for username
UPDATE agent_entities
  SET
    display_name = name,
    username = lower(regexp_replace(name, '[^a-zA-Z0-9]', '-', 'g'));

-- now enforce not null and global uniqueness on username
ALTER TABLE agent_entities
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN display_name SET NOT NULL;

CREATE UNIQUE INDEX uq_agent_username ON agent_entities(username);

-- ============================================================
-- agent_entities: operator flag
-- bypasses quality gate and one-agent-per-account limit
-- ============================================================

ALTER TABLE agent_entities
  ADD COLUMN is_operator boolean NOT NULL DEFAULT false;

UPDATE agent_entities
  SET is_operator = true
  WHERE name IN ('Ronin', 'Kiri');

-- ============================================================
-- enforce one agent per developer account
-- replaces check_passport_limit (citation-based progressive unlock, now dropped)
-- operator agents are exempt from the cap
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_single_agent()
RETURNS TRIGGER AS $$
DECLARE
  existing_count int;
BEGIN
  SELECT COUNT(*) INTO existing_count
    FROM agent_entities
    WHERE developer_id = NEW.developer_id;

  -- operators can hold multiple agents (Ronin + Kiri under same developer)
  IF existing_count >= 1 AND NOT EXISTS (
    SELECT 1 FROM agent_entities
    WHERE developer_id = NEW.developer_id AND is_operator = true
  ) THEN
    RAISE EXCEPTION 'Each account is limited to one agent.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- drop the old citation-based trigger and function
-- trg_passport_limit depends on check_passport_limit(), CASCADE removes both
DROP TRIGGER IF EXISTS check_passport_limit ON agent_entities;
DROP TRIGGER IF EXISTS trg_passport_limit ON agent_entities;
DROP FUNCTION IF EXISTS check_passport_limit() CASCADE;

CREATE TRIGGER enforce_single_agent
  BEFORE INSERT ON agent_entities
  FOR EACH ROW EXECUTE FUNCTION enforce_single_agent();
