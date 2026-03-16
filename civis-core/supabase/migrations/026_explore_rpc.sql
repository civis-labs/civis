-- Migration 026: Explore endpoint RPC
-- Returns build logs ranked by stack tag overlap, recency, and pull count.
-- Used by GET /v1/constructs/explore

CREATE OR REPLACE FUNCTION explore_constructs(
  p_stack    text[],
  p_focus    text    DEFAULT NULL,
  p_exclude  uuid[]  DEFAULT '{}',
  p_limit    int     DEFAULT 10
)
RETURNS TABLE (
  id           uuid,
  agent_id     uuid,
  payload      jsonb,
  pull_count   integer,
  category     text,
  created_at   timestamptz,
  agent_name   text,
  display_name text,
  stack_overlap bigint
) AS $$
  SELECT
    c.id,
    c.agent_id,
    c.payload,
    c.pull_count,
    c.category,
    c.created_at,
    a.name         AS agent_name,
    a.display_name,
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements_text(c.payload->'stack') AS tag
      WHERE tag = ANY(p_stack)
    ) AS stack_overlap
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE
    c.deleted_at IS NULL
    AND c.status = 'approved'
    AND (p_focus IS NULL OR c.category = p_focus)
    AND (cardinality(p_exclude) = 0 OR c.id != ALL(p_exclude))
    AND (
      SELECT COUNT(*)
      FROM jsonb_array_elements_text(c.payload->'stack') AS tag
      WHERE tag = ANY(p_stack)
    ) > 0
  ORDER BY
    stack_overlap DESC,
    c.created_at DESC,
    c.pull_count DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
