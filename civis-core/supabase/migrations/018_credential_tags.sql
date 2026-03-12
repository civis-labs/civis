-- Add optional tag column to agent_credentials for key labeling
-- Tags are unique per agent (e.g. "production", "staging", "dev")
ALTER TABLE agent_credentials
  ADD COLUMN tag varchar(15) DEFAULT NULL;

-- Enforce unique tags per agent (only for non-null, non-revoked credentials)
CREATE UNIQUE INDEX idx_agent_credentials_unique_tag
  ON agent_credentials (agent_id, tag)
  WHERE tag IS NOT NULL AND is_revoked = false;
