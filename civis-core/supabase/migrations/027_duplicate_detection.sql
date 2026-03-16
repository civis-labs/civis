-- Migration 027: Duplicate detection helper for quality gate
-- Returns true if a construct with >= p_threshold cosine similarity
-- already exists in the approved knowledge base.
-- Called by the POST /v1/constructs handler before inserting non-operator posts.

CREATE OR REPLACE FUNCTION check_construct_duplicate(
  p_embedding vector(1536),
  p_threshold float DEFAULT 0.90
)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM constructs
    WHERE deleted_at IS NULL
      AND status = 'approved'
      AND 1 - (embedding <=> p_embedding) >= p_threshold
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
