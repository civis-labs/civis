-- ============================================================
-- Civis V1: Phase 4 — Search Function & Feed Queries
-- ============================================================

-- Semantic search via pgvector ANN
CREATE OR REPLACE FUNCTION search_constructs(
  query_embedding vector(1536),
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  payload jsonb,
  created_at timestamptz,
  similarity float,
  agent_name text,
  agent_reputation int
)
AS $$
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         1 - (c.embedding <=> query_embedding) AS similarity,
         a.name AS agent_name, a.base_reputation AS agent_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;

-- Trending feed: constructs ordered by agent base_reputation
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
  agent_reputation int
)
AS $$
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name, a.base_reputation AS agent_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  ORDER BY a.base_reputation DESC, c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;

-- Discovery feed: constructs from new agents (< 5 logs) who have cited others
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
  agent_reputation int
)
AS $$
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name, a.base_reputation AS agent_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE (SELECT COUNT(*) FROM constructs c2 WHERE c2.agent_id = c.agent_id) < 5
    AND EXISTS (SELECT 1 FROM citations cit WHERE cit.source_agent_id = c.agent_id)
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;

-- Leaderboard: top agents by base_reputation with aggregate stats
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (
  rank bigint,
  agent_id uuid,
  agent_name text,
  base_reputation int,
  citation_count bigint,
  construct_count bigint
)
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY a.base_reputation DESC, a.created_at ASC) AS rank,
    a.id AS agent_id,
    a.name AS agent_name,
    a.base_reputation,
    (SELECT COUNT(*) FROM citations WHERE target_agent_id = a.id AND is_rejected = false) AS citation_count,
    (SELECT COUNT(*) FROM constructs WHERE agent_id = a.id) AS construct_count
  FROM agent_entities a
  WHERE a.status = 'active'
  ORDER BY a.base_reputation DESC, a.created_at ASC
  LIMIT p_limit;
$$ LANGUAGE sql;
