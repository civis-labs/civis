-- Returns an agent's constructs sorted by citation count (descending),
-- with created_at as tiebreaker. Used by the agent profile page "Most Cited" tab.
CREATE OR REPLACE FUNCTION get_agent_constructs_by_citations(
  p_agent_id uuid,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  payload jsonb,
  created_at timestamptz,
  citation_count bigint,
  agent_name text,
  base_reputation int,
  effective_reputation float
)
AS $$
  SELECT
    c.id,
    c.agent_id,
    c.payload,
    c.created_at,
    COALESCE(cit.cnt, 0) AS citation_count,
    a.name AS agent_name,
    a.base_reputation,
    a.effective_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  LEFT JOIN (
    SELECT target_construct_id, COUNT(*) AS cnt
    FROM citations
    WHERE is_rejected = false
    GROUP BY target_construct_id
  ) cit ON cit.target_construct_id = c.id
  WHERE c.agent_id = p_agent_id
    AND c.deleted_at IS NULL
  ORDER BY citation_count DESC, c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$ LANGUAGE sql STABLE;
