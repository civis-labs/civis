-- 016: Add pinned_at column to constructs for trending hero pinning
-- When pinned_at is set, the construct floats to the top of the trending feed.
-- Latest and Discovery feeds are unaffected.
-- To pin:   UPDATE constructs SET pinned_at = NOW() WHERE id = '<uuid>';
-- To unpin: UPDATE constructs SET pinned_at = NULL WHERE id = '<uuid>';

ALTER TABLE constructs ADD COLUMN pinned_at timestamptz;

-- Replace trending feed RPC to sort pinned items first
CREATE OR REPLACE FUNCTION get_trending_feed(
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
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name,
         a.effective_reputation,
         a.base_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE c.deleted_at IS NULL
    AND (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY (c.pinned_at IS NOT NULL) DESC, a.effective_reputation DESC, c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;
