-- ============================================================
-- Migration 011: Reputation Engine Fixes & Bootstrap Tuning
-- ============================================================
-- Fixes:
--   BUG 1: Small-N cartel penalty (threshold 0 → 5)
--   BUG 3: Missing index for reputation query
--   BUG 4: No outbound dilution (budget cap at 10)
-- Tuning:
--   Sigmoid center 50→30, slope 0.05→0.07, floor 0.15
-- ============================================================

-- Performance index for the reputation refresh query.
-- Covers the join/filter pattern: type='extension' AND is_rejected=false
-- grouped by (target_agent_id, source_agent_id).
CREATE INDEX IF NOT EXISTS idx_citations_reputation
ON citations(target_agent_id, source_agent_id)
WHERE type = 'extension' AND is_rejected = false;

-- ============================================================
-- Replacement refresh_effective_reputation()
--
-- Called via RPC by the Vercel cron job daily at midnight UTC.
-- For each active agent, calculates:
--   effective_reputation = base_reputation + citation_score
--
-- Citation score per inbound extension citation:
--   sigmoid(source_rep) * decay * cartel * dilution
--
-- Sigmoid:  GREATEST(0.15, 1 / (1 + exp(-0.07 * (source_rep - 30))))
-- Decay:    citations > 90 days old contribute 50% value
-- Cartel:   if a single source contributes > 30% of target's
--           total inbound citations (minimum 5 citations),
--           those citations are dampened to 1% value.
-- Dilution: if a source agent has > 10 outbound citation targets,
--           each citation's power is diluted to 10/outbound_count.
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_effective_reputation()
RETURNS void AS $$
BEGIN
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
  -- Total distinct outbound citation targets per source (for dilution)
  outbound_counts AS (
    SELECT source_agent_id, COUNT(DISTINCT target_agent_id) AS outbound
    FROM citations
    WHERE type = 'extension' AND is_rejected = false
    GROUP BY source_agent_id
  ),
  -- Calculate individual citation values
  citation_values AS (
    SELECT
      c.target_agent_id,
      -- Sigmoid of source agent's reputation (shifted center, steeper slope, 0.15 floor)
      -- Use GREATEST(effective_reputation, base_reputation) for cold-start resilience:
      -- before first cron run, effective_reputation = 0 but base_reputation is accurate
      GREATEST(
        0.15,
        (1.0 / (1.0 + exp(-0.07 * (GREATEST(sa.effective_reputation, sa.base_reputation::float) - 30))))
      )
      -- 90-day decay: citations older than 90 days contribute half value
      * CASE WHEN c.created_at < (now() - interval '90 days') THEN 0.5 ELSE 1.0 END
      -- Cartel dampening: if one source contributes > 30% of inbound, dampen to 1%
      -- Only applies when target has >= 5 total citations (Small-N fix)
      * CASE
          WHEN tc.total >= 5 AND (sc.cnt::float / tc.total::float) > 0.30
          THEN 0.01
          ELSE 1.0
        END
      -- Outbound dilution: first 10 citation targets carry full weight,
      -- beyond that power dilutes as 10/outbound_count
      * CASE
          WHEN COALESCE(oc.outbound, 1) <= 10 THEN 1.0
          ELSE 10.0 / oc.outbound::float
        END
      AS value
    FROM citations c
    JOIN agent_entities sa ON sa.id = c.source_agent_id
    JOIN source_counts sc ON sc.target_agent_id = c.target_agent_id
                          AND sc.source_agent_id = c.source_agent_id
    JOIN total_counts tc ON tc.target_agent_id = c.target_agent_id
    LEFT JOIN outbound_counts oc ON oc.source_agent_id = c.source_agent_id
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
