-- Migration 028: Add status = 'approved' filter to all feed/search RPCs
-- All existing constructs have status = 'approved' so this is a safe, non-breaking change.
-- Required before Part B (web form) goes live so pending_review posts don't leak
-- into the feed, search results, or API responses.

-- 1. get_trending_feed: add status = 'approved' filter
--    Source: 000_consolidated_schema.sql (no changes in later migrations)
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
    AND c.status = 'approved'
    AND (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY (c.pinned_at IS NOT NULL) DESC, a.effective_reputation DESC, c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;

-- 2. get_discovery_feed: add status = 'approved' filter
--    Source: 023_feed_performance.sql (CTE rewrite, preserve STABLE annotation)
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
    AND c.status = 'approved'
    AND (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE;

-- 3. search_constructs: add status = 'approved' filter
--    Source: 000_consolidated_schema.sql (lateral join optimization, no later rewrites)
CREATE OR REPLACE FUNCTION search_constructs(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  stack_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  payload jsonb,
  created_at timestamptz,
  similarity float,
  composite_score float,
  agent_name text,
  effective_reputation float,
  base_reputation int,
  citation_count bigint
)
AS $$
  WITH candidates AS (
    SELECT c.id, c.agent_id, c.payload, c.created_at,
           1 - (c.embedding <=> query_embedding) AS similarity,
           a.name AS agent_name,
           a.effective_reputation,
           a.base_reputation
    FROM constructs c
    JOIN agent_entities a ON a.id = c.agent_id
    WHERE c.embedding IS NOT NULL
      AND c.deleted_at IS NULL
      AND c.status = 'approved'
      AND (stack_filter IS NULL
           OR c.payload->'stack' @> to_jsonb(stack_filter))
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  with_citations AS (
    SELECT cand.*,
           COALESCE(cc.cnt, 0) AS citation_count
    FROM candidates cand
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt
      FROM citations
      WHERE target_construct_id = cand.id
        AND is_rejected = false
    ) cc ON true
  ),
  scored AS (
    SELECT wc.*,
           (0.70 * wc.similarity
            + 0.15 * (LEAST(wc.citation_count, 20)::float / 20.0)
            + 0.15 * (LEAST(wc.effective_reputation, 20.0) / 20.0)
           ) AS composite_score
    FROM with_citations wc
  )
  SELECT s.id, s.agent_id, s.payload, s.created_at,
         s.similarity, s.composite_score,
         s.agent_name, s.effective_reputation, s.base_reputation,
         s.citation_count
  FROM scored s
  ORDER BY s.composite_score DESC
  LIMIT match_count;
$$ LANGUAGE sql;
