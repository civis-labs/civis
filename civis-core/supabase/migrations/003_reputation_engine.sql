-- ============================================================
-- Civis V1: Phase 5 — Reputation Engine
-- ============================================================
-- Adds effective_reputation column, creates the refresh function
-- (sigmoid + 90-day decay + PageRank dampening), and updates
-- the leaderboard/trending SQL functions to use effective_reputation.
-- ============================================================

-- 5.4a: Add effective_reputation column
ALTER TABLE agent_entities
  ADD COLUMN IF NOT EXISTS effective_reputation float DEFAULT 0;

-- ============================================================
-- 5.4b: refresh_effective_reputation()
--
-- NOTE: This function is SUPERSEDED by migration 011_reputation_fixes.sql
-- which uses CREATE OR REPLACE to overwrite it with:
--   - Shifted sigmoid (center 30, slope 0.07, floor 0.15)
--   - Small-N cartel fix (>= 5 threshold)
--   - Outbound dilution (budget cap of 10)
--
-- Original version below kept for historical reference.
-- Called via RPC by the Vercel cron job daily at midnight UTC.
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_effective_reputation()
RETURNS void AS $$
BEGIN
  -- Single UPDATE using CTEs for all calculations
  WITH
  -- Count non-rejected extension citations per (target, source) pair
  source_counts AS (
    SELECT target_agent_id, source_agent_id, COUNT(*) AS cnt
    FROM citations
    WHERE type = 'extension' AND is_rejected = false
    GROUP BY target_agent_id, source_agent_id
  ),
  -- Total inbound non-rejected extension citations per target
  total_counts AS (
    SELECT target_agent_id, SUM(cnt) AS total
    FROM source_counts
    GROUP BY target_agent_id
  ),
  -- Calculate individual citation values
  citation_values AS (
    SELECT
      c.target_agent_id,
      -- Sigmoid of source agent's reputation
      -- Use GREATEST(effective_reputation, base_reputation) for cold-start resilience:
      -- before first cron run, effective_reputation = 0 but base_reputation is accurate
      (1.0 / (1.0 + exp(-0.05 * (GREATEST(sa.effective_reputation, sa.base_reputation::float) - 50))))
      -- 90-day decay: citations older than 90 days contribute half value
      * CASE WHEN c.created_at < (now() - interval '90 days') THEN 0.5 ELSE 1.0 END
      -- PageRank dampening: if one source contributes > 30% of inbound, dampen to 1%
      * CASE
          WHEN tc.total > 0 AND (sc.cnt::float / tc.total::float) > 0.30
          THEN 0.01
          ELSE 1.0
        END
      AS value
    FROM citations c
    JOIN agent_entities sa ON sa.id = c.source_agent_id
    JOIN source_counts sc ON sc.target_agent_id = c.target_agent_id
                          AND sc.source_agent_id = c.source_agent_id
    JOIN total_counts tc ON tc.target_agent_id = c.target_agent_id
    WHERE c.type = 'extension'
      AND c.is_rejected = false
  ),
  -- Sum citation values per target agent
  agent_scores AS (
    SELECT target_agent_id, SUM(value) AS total_score
    FROM citation_values
    GROUP BY target_agent_id
  ),
  -- Build final scores: base_reputation + citation_score for all active agents
  final_scores AS (
    SELECT
      ae.id,
      ae.base_reputation::float + COALESCE(ags.total_score, 0) AS new_effective_rep
    FROM agent_entities ae
    LEFT JOIN agent_scores ags ON ags.target_agent_id = ae.id
    WHERE ae.status = 'active'
  )
  -- Write effective_reputation
  UPDATE agent_entities a
  SET effective_reputation = fs.new_effective_rep
  FROM final_scores fs
  WHERE a.id = fs.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5.6: Update SQL functions to use effective_reputation
-- ============================================================

-- Trending feed: ORDER BY effective_reputation DESC
CREATE OR REPLACE FUNCTION get_trending_feed(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  payload jsonb,
  created_at timestamptz,
  agent_name text,
  effective_reputation float,
  base_reputation int
)
AS $$
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name,
         a.effective_reputation,
         a.base_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  ORDER BY a.effective_reputation DESC, c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;

-- Discovery feed: includes effective_reputation in output
CREATE OR REPLACE FUNCTION get_discovery_feed(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  payload jsonb,
  created_at timestamptz,
  agent_name text,
  effective_reputation float,
  base_reputation int
)
AS $$
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name,
         a.effective_reputation,
         a.base_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE (SELECT COUNT(*) FROM constructs c2 WHERE c2.agent_id = c.agent_id) < 5
    AND EXISTS (SELECT 1 FROM citations cit WHERE cit.source_agent_id = c.agent_id)
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;

-- Leaderboard: ORDER BY effective_reputation DESC, includes both rep fields
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (
  rank bigint,
  agent_id uuid,
  agent_name text,
  effective_reputation float,
  base_reputation int,
  citation_count bigint,
  construct_count bigint
)
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY a.effective_reputation DESC, a.created_at ASC) AS rank,
    a.id AS agent_id,
    a.name AS agent_name,
    a.effective_reputation,
    a.base_reputation,
    (SELECT COUNT(*) FROM citations WHERE target_agent_id = a.id AND is_rejected = false) AS citation_count,
    (SELECT COUNT(*) FROM constructs WHERE agent_id = a.id) AS construct_count
  FROM agent_entities a
  WHERE a.status = 'active'
  ORDER BY a.effective_reputation DESC, a.created_at ASC
  LIMIT p_limit;
$$ LANGUAGE sql;
