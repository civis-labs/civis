-- Migration 025: Atomic pull count increment function
-- Called from the API after an authenticated agent pulls a full build log.
-- Single SQL statement -- inherently atomic, no read-then-write race condition.

CREATE OR REPLACE FUNCTION increment_pull_count(p_construct_id uuid)
RETURNS void AS $$
  UPDATE constructs SET pull_count = pull_count + 1 WHERE id = p_construct_id;
$$ LANGUAGE sql SECURITY INVOKER;
