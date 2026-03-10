-- ============================================================
-- Civis V1: Phase — Tag Discovery & Stack Filtering
-- ============================================================
-- 1. New RPC get_tag_counts(): Extracts unique tags from
--    payload->'stack' across all constructs, returns tag + count.
-- 2. Updates get_trending_feed() and get_discovery_feed() to accept
--    an optional p_tag parameter for JSONB containment filtering.
-- ============================================================

-- ============================================================
-- get_tag_counts()
--
-- Unnests the payload->'stack' JSONB array from every construct,
-- groups by the tag value, and returns (tag, count) sorted by
-- count descending. Used by the /explore page.
-- ============================================================

CREATE OR REPLACE FUNCTION get_tag_counts()
RETURNS TABLE (
  tag text,
  count bigint
)
AS $$
  SELECT elem::text AS tag, COUNT(*) AS count
  FROM constructs c,
       jsonb_array_elements_text(c.payload->'stack') AS elem
  GROUP BY elem
  ORDER BY count DESC, tag ASC;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Update get_trending_feed() with optional p_tag filter
-- ============================================================

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
  WHERE (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY a.effective_reputation DESC, c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;

-- ============================================================
-- Update get_discovery_feed() with optional p_tag filter
-- ============================================================

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
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name,
         a.effective_reputation,
         a.base_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE (SELECT COUNT(*) FROM constructs c2 WHERE c2.agent_id = c.agent_id) < 5
    AND EXISTS (SELECT 1 FROM citations cit WHERE cit.source_agent_id = c.agent_id)
    AND (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;
