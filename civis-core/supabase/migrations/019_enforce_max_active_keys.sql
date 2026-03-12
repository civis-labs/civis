-- Enforce max 3 active (non-revoked) API keys per agent at the database level.
-- Closes a TOCTOU race condition in the application-layer count check.

CREATE OR REPLACE FUNCTION enforce_max_active_keys()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT count(*) FROM agent_credentials
    WHERE agent_id = NEW.agent_id AND is_revoked = false
  ) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 active API keys per agent. Revoke an existing key first.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_max_active_keys
  BEFORE INSERT ON agent_credentials
  FOR EACH ROW EXECUTE FUNCTION enforce_max_active_keys();
