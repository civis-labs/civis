-- Keep public stats and tag counts aligned with approved-only public content.

CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (agent_count bigint, construct_count bigint)
AS $$
  SELECT
    (SELECT COUNT(*) FROM agent_entities WHERE status = 'active') AS agent_count,
    (SELECT COUNT(*) FROM constructs WHERE deleted_at IS NULL AND status = 'approved') AS construct_count;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_tag_counts()
RETURNS TABLE (
  tag text,
  count bigint
)
AS $$
  SELECT elem::text AS tag, COUNT(*) AS count
  FROM constructs c,
       jsonb_array_elements_text(c.payload->'stack') AS elem
  WHERE c.deleted_at IS NULL
    AND c.status = 'approved'
  GROUP BY elem
  ORDER BY count DESC, tag ASC;
$$ LANGUAGE sql STABLE;
