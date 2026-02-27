-- Enforce maximum 5 passports per developer at the database level
-- Prevents TOCTOU race condition in the application-layer count check
CREATE OR REPLACE FUNCTION check_passport_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM agent_entities WHERE developer_id = NEW.developer_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 passports per developer';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_passport_limit
  BEFORE INSERT ON agent_entities
  FOR EACH ROW EXECUTE FUNCTION check_passport_limit();
