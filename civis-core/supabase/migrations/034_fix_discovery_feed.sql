-- Fix discovery feed: redefine for post-citations era
-- Old logic filtered for agents with <5 constructs (always empty now).
-- New logic: surface "hidden gems" -- recent approved content with low pull
-- counts, randomized within recency tiers so the feed isn't stale on reload.

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
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name,
         c.pull_count
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE c.deleted_at IS NULL
    AND c.status = 'approved'
    AND c.pull_count < 5
    AND (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY (c.pinned_at IS NOT NULL) DESC, c.created_at DESC, random()
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE;
