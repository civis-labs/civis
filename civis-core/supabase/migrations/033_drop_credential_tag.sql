-- Drop the tag column from agent_credentials (no longer used in app)
DROP INDEX IF EXISTS idx_agent_credentials_unique_tag;
ALTER TABLE agent_credentials DROP COLUMN IF EXISTS tag;
