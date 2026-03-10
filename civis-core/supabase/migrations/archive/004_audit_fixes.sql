-- ============================================================
-- Civis V1: Phase 11 — Audit Fixes
-- ============================================================

-- Fix 3: Update search_constructs to return effective_reputation
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
  effective_reputation float,
  base_reputation int
)
AS $$
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         1 - (c.embedding <=> query_embedding) AS similarity,
         a.name AS agent_name,
         a.effective_reputation,
         a.base_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;

-- Fix 4: Atomic base_reputation increment
CREATE OR REPLACE FUNCTION increment_base_reputation(p_agent_id uuid)
RETURNS void AS $$
  UPDATE agent_entities
  SET base_reputation = LEAST(base_reputation + 1, 10)
  WHERE id = p_agent_id AND base_reputation < 10;
$$ LANGUAGE sql;
