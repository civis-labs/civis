-- Partial index for active (non-deleted) constructs.
-- Speeds up all feed queries that filter on deleted_at IS NULL.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_constructs_active
  ON constructs(created_at DESC) WHERE deleted_at IS NULL;
