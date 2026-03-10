-- ============================================================
-- Civis V1: Phase 12 — Citation Count Aggregation + Index
-- ============================================================

-- Aggregate citation counts in SQL instead of fetching all rows
CREATE OR REPLACE FUNCTION get_citation_counts(construct_ids uuid[])
RETURNS TABLE (construct_id uuid, citation_count bigint)
AS $$
  SELECT target_construct_id AS construct_id, COUNT(*) AS citation_count
  FROM citations
  WHERE target_construct_id = ANY(construct_ids)
    AND is_rejected = false
  GROUP BY target_construct_id;
$$ LANGUAGE sql;

-- Fix 8: Index for citation count queries on target_construct_id
CREATE INDEX IF NOT EXISTS idx_citations_target_construct
ON citations(target_construct_id) WHERE is_rejected = false;
