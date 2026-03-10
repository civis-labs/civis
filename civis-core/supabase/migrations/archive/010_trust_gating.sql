-- ============================================================
-- Migration 010: Trust Gating System
-- Adds trust_tier, github_signals, card_fingerprint to developers.
-- Replaces hard passport limit trigger with citation-based version.
-- Adds RPCs for construct count, inbound citations, trust promotion,
-- and card fingerprint dedup.
-- ============================================================

-- 1. Add trust gating columns to developers
ALTER TABLE developers
  ADD COLUMN trust_tier text NOT NULL DEFAULT 'standard'
    CHECK (trust_tier IN ('unverified', 'standard', 'established')),
  ADD COLUMN github_signals jsonb,
  ADD COLUMN card_fingerprint text;

-- 2. Replace passport limit trigger with citation-based version
CREATE OR REPLACE FUNCTION check_passport_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count int;
  citation_count int;
  max_allowed int;
BEGIN
  SELECT COUNT(*) INTO current_count
    FROM agent_entities WHERE developer_id = NEW.developer_id;

  -- Count distinct inbound extension citations from OTHER developers
  SELECT COUNT(DISTINCT c.source_agent_id) INTO citation_count
    FROM citations c
    JOIN agent_entities target_agent ON c.target_agent_id = target_agent.id
    JOIN agent_entities source_agent ON c.source_agent_id = source_agent.id
    WHERE target_agent.developer_id = NEW.developer_id
      AND source_agent.developer_id != NEW.developer_id
      AND c.type = 'extension'
      AND c.is_rejected = false;

  IF citation_count >= 1 THEN max_allowed := 5;
  ELSE max_allowed := 1;
  END IF;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Passport limit: % allowed. Earn citations from other developers to unlock more.', max_allowed;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger trg_passport_limit already exists from migration 006.
-- CREATE OR REPLACE FUNCTION replaces the function body in-place,
-- so the existing trigger automatically uses the new logic.

-- 3. RPC: get_developer_construct_count
-- Returns total constructs across all of a developer's agents.
CREATE OR REPLACE FUNCTION get_developer_construct_count(p_developer_id uuid)
RETURNS int AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::int
    FROM constructs c
    JOIN agent_entities a ON c.agent_id = a.id
    WHERE a.developer_id = p_developer_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. RPC: get_developer_inbound_citation_count
-- Returns count of distinct inbound extension citations from other developers.
CREATE OR REPLACE FUNCTION get_developer_inbound_citation_count(p_developer_id uuid)
RETURNS int AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT c.source_agent_id)::int
    FROM citations c
    JOIN agent_entities target_agent ON c.target_agent_id = target_agent.id
    JOIN agent_entities source_agent ON c.source_agent_id = source_agent.id
    WHERE target_agent.developer_id = p_developer_id
      AND source_agent.developer_id != p_developer_id
      AND c.type = 'extension'
      AND c.is_rejected = false
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. RPC: promote_trust_tier
-- Atomically upgrades trust_tier to 'established' when developer has
-- 1+ inbound citation from a different developer. No-op if already established.
CREATE OR REPLACE FUNCTION promote_trust_tier(p_developer_id uuid)
RETURNS void AS $$
DECLARE
  citation_count int;
BEGIN
  SELECT get_developer_inbound_citation_count(p_developer_id) INTO citation_count;

  IF citation_count >= 1 THEN
    UPDATE developers
    SET trust_tier = 'established'
    WHERE id = p_developer_id
      AND trust_tier != 'established';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. RPC: check_card_fingerprint
-- Returns true if the fingerprint exists for a DIFFERENT developer.
CREATE OR REPLACE FUNCTION check_card_fingerprint(p_fingerprint text, p_developer_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM developers
    WHERE card_fingerprint = p_fingerprint
      AND id != p_developer_id
  );
END;
$$ LANGUAGE plpgsql STABLE;
