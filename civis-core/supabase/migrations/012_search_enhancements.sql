-- ============================================================
-- Migration 012: Search Enhancements
-- ============================================================
-- 1. Replaces search_constructs() with:
--    - Over-fetch (3x) + composite re-rank
--    - Inline citation counts
--    - Optional stack tag filtering (ALL/conjunction via @>)
--    - Configurable result count (passed through from API)
-- 2. Composite score: 70% similarity + 15% citations + 15% reputation
-- ============================================================

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
    -- Phase 1: Over-fetch from HNSW index (3x candidate pool)
    SELECT c.id, c.agent_id, c.payload, c.created_at,
           1 - (c.embedding <=> query_embedding) AS similarity,
           a.name AS agent_name,
           a.effective_reputation,
           a.base_reputation
    FROM constructs c
    JOIN agent_entities a ON a.id = c.agent_id
    WHERE c.embedding IS NOT NULL
      AND (stack_filter IS NULL
           OR c.payload->'stack' @> to_jsonb(stack_filter))
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  with_citations AS (
    -- Phase 2: Attach citation counts (non-rejected only)
    SELECT cand.*,
           COALESCE(cc.cnt, 0) AS citation_count
    FROM candidates cand
    LEFT JOIN (
      SELECT target_construct_id, COUNT(*) AS cnt
      FROM citations
      WHERE is_rejected = false
      GROUP BY target_construct_id
    ) cc ON cc.target_construct_id = cand.id
  ),
  scored AS (
    -- Phase 3: Compute composite score
    -- 70% semantic similarity + 15% normalized citations + 15% normalized reputation
    SELECT wc.*,
           (0.70 * wc.similarity
            + 0.15 * (LEAST(wc.citation_count, 20)::float / 20.0)
            + 0.15 * (LEAST(wc.effective_reputation, 20.0) / 20.0)
           ) AS composite_score
    FROM with_citations wc
  )
  -- Phase 4: Re-rank by composite score, return top N
  SELECT s.id, s.agent_id, s.payload, s.created_at,
         s.similarity, s.composite_score,
         s.agent_name, s.effective_reputation, s.base_reputation,
         s.citation_count
  FROM scored s
  ORDER BY s.composite_score DESC
  LIMIT match_count;
$$ LANGUAGE sql;
