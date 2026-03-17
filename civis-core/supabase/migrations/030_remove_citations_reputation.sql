-- ============================================================
-- Migration 030: Remove citations, reputation, and leaderboard
-- ============================================================
-- Run this BEFORE pushing the code changes.
-- Order matters: rewrite RPCs first, then drop tables/columns.
-- ============================================================

-- -------------------------------------------------------
-- STEP 0: Drop existing functions (return types changed, CREATE OR REPLACE won't work)
-- -------------------------------------------------------

DROP FUNCTION IF EXISTS search_constructs(vector, int, text[]);
DROP FUNCTION IF EXISTS get_trending_feed(int, int, text);
DROP FUNCTION IF EXISTS get_discovery_feed(int, int, text);
DROP FUNCTION IF EXISTS get_platform_stats();

-- -------------------------------------------------------
-- STEP 1: Rewrite RPCs that reference citations/reputation
-- -------------------------------------------------------

-- search_constructs: remove citation_count and effective_reputation from scoring
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
  pull_count int
)
AS $$
  WITH candidates AS (
    SELECT c.id, c.agent_id, c.payload, c.created_at, c.pull_count,
           1 - (c.embedding <=> query_embedding) AS similarity,
           a.name AS agent_name
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
  scored AS (
    SELECT cand.*,
           (0.85 * cand.similarity
            + 0.15 * (LEAST(cand.pull_count, 50)::float / 50.0)
           ) AS composite_score
    FROM candidates cand
  )
  SELECT s.id, s.agent_id, s.payload, s.created_at,
         s.similarity, s.composite_score,
         s.agent_name, s.pull_count
  FROM scored s
  ORDER BY s.composite_score DESC
  LIMIT match_count;
$$ LANGUAGE sql;

-- get_trending_feed: sort by pull_count instead of effective_reputation
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
  pull_count int
)
AS $$
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name,
         c.pull_count
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE c.deleted_at IS NULL
    AND c.status = 'approved'
    AND (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY (c.pinned_at IS NOT NULL) DESC, c.pull_count DESC, c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE;

-- get_discovery_feed: remove citing_agents CTE (queries citations table)
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
  pull_count int
)
AS $$
  WITH agent_construct_counts AS (
    SELECT agent_id, COUNT(*) AS cnt
    FROM constructs
    WHERE deleted_at IS NULL
    GROUP BY agent_id
    HAVING COUNT(*) < 5
  )
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name,
         c.pull_count
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  JOIN agent_construct_counts acc ON acc.agent_id = c.agent_id
  WHERE c.deleted_at IS NULL
    AND c.status = 'approved'
    AND (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE;

-- get_platform_stats: remove citation_count
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (agent_count bigint, construct_count bigint)
AS $$
  SELECT
    (SELECT COUNT(*) FROM agent_entities WHERE status = 'active') AS agent_count,
    (SELECT COUNT(*) FROM constructs WHERE deleted_at IS NULL) AS construct_count;
$$ LANGUAGE sql STABLE;

-- -------------------------------------------------------
-- STEP 2: Drop citation tables (cascades indexes, triggers, RLS policies)
-- -------------------------------------------------------

DROP TABLE IF EXISTS citation_rejections CASCADE;
DROP TABLE IF EXISTS citations CASCADE;

-- -------------------------------------------------------
-- STEP 3: Drop all citation/reputation functions
-- -------------------------------------------------------

DROP FUNCTION IF EXISTS get_leaderboard(int);
DROP FUNCTION IF EXISTS refresh_effective_reputation();
DROP FUNCTION IF EXISTS increment_base_reputation(uuid);
DROP FUNCTION IF EXISTS get_citation_counts(uuid[]);
DROP FUNCTION IF EXISTS get_agent_constructs_by_citations(uuid, int, int);
DROP FUNCTION IF EXISTS check_correction_citation_cap();
DROP FUNCTION IF EXISTS get_developer_inbound_citation_count(uuid);
DROP FUNCTION IF EXISTS promote_trust_tier(uuid);
DROP FUNCTION IF EXISTS check_passport_limit();

-- Note: trg_correction_citation_cap was on the citations table, already dropped by CASCADE above.
-- trg_passport_limit was already dropped by migration 024 (replaced by enforce_single_agent).
-- check_passport_limit() was already dropped by migration 024 but IF EXISTS makes this safe.

-- -------------------------------------------------------
-- STEP 4: Remove reputation columns from agent_entities
-- -------------------------------------------------------

ALTER TABLE agent_entities DROP COLUMN IF EXISTS base_reputation;
ALTER TABLE agent_entities DROP COLUMN IF EXISTS effective_reputation;

-- -------------------------------------------------------
-- STEP 5: Remove stale payload constraint
-- -------------------------------------------------------

ALTER TABLE constructs DROP CONSTRAINT IF EXISTS chk_payload_citations;
