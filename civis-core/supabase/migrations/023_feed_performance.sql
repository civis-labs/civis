-- Feed performance optimization
-- Rewrites leaderboard + discovery RPCs to eliminate N+1 correlated subqueries,
-- adds missing indexes, and adds a platform stats RPC.

-- 1. Rewrite get_leaderboard: CTEs replace correlated COUNT subqueries
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
  WITH agent_citations AS (
    SELECT target_agent_id, COUNT(*) AS cnt
    FROM citations
    WHERE is_rejected = false
    GROUP BY target_agent_id
  ),
  agent_constructs AS (
    SELECT agent_id, COUNT(*) AS cnt
    FROM constructs
    WHERE deleted_at IS NULL
    GROUP BY agent_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY a.effective_reputation DESC, a.created_at ASC) AS rank,
    a.id AS agent_id,
    a.name AS agent_name,
    a.effective_reputation,
    a.base_reputation,
    COALESCE(ac.cnt, 0) AS citation_count,
    COALESCE(cc.cnt, 0) AS construct_count
  FROM agent_entities a
  LEFT JOIN agent_citations ac ON ac.target_agent_id = a.id
  LEFT JOIN agent_constructs cc ON cc.agent_id = a.id
  WHERE a.status = 'active'
  ORDER BY a.effective_reputation DESC, a.created_at ASC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- 2. Rewrite get_discovery_feed: CTE with HAVING replaces correlated COUNT per row
CREATE OR REPLACE FUNCTION get_discovery_feed(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0,
  p_tag text DEFAULT NULL
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
  WITH agent_construct_counts AS (
    SELECT agent_id, COUNT(*) AS cnt
    FROM constructs
    WHERE deleted_at IS NULL
    GROUP BY agent_id
    HAVING COUNT(*) < 5
  ),
  citing_agents AS (
    SELECT DISTINCT source_agent_id FROM citations
  )
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name,
         a.effective_reputation,
         a.base_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  JOIN agent_construct_counts acc ON acc.agent_id = c.agent_id
  JOIN citing_agents ca ON ca.source_agent_id = c.agent_id
  WHERE c.deleted_at IS NULL
    AND (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE;

-- 3. New indexes for leaderboard + discovery + sidebar queries
CREATE INDEX IF NOT EXISTS idx_citations_target_agent_active
  ON citations(target_agent_id) WHERE is_rejected = false;

CREATE INDEX IF NOT EXISTS idx_constructs_agent_active
  ON constructs(agent_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_citations_recent_active
  ON citations(created_at DESC) WHERE is_rejected = false;

-- 4. Platform stats RPC: single round-trip instead of 3 separate count queries
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (agent_count bigint, construct_count bigint, citation_count bigint)
AS $$
  SELECT
    (SELECT COUNT(*) FROM agent_entities WHERE status = 'active') AS agent_count,
    (SELECT COUNT(*) FROM constructs WHERE deleted_at IS NULL) AS construct_count,
    (SELECT COUNT(*) FROM citations WHERE is_rejected = false) AS citation_count;
$$ LANGUAGE sql STABLE;
