-- Migration 021: Update passport limit to max 2 (was 5)
-- 0 citations = 1 passport, 1+ citation = 2 passports
CREATE OR REPLACE FUNCTION check_passport_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count int;
  citation_count int;
  max_allowed int;
BEGIN
  SELECT COUNT(*) INTO current_count
    FROM agent_entities WHERE developer_id = NEW.developer_id;

  -- Count distinct inbound extension citations from OTHER developers
  SELECT COUNT(DISTINCT c.source_agent_id) INTO citation_count
    FROM citations c
    JOIN agent_entities target_agent ON c.target_agent_id = target_agent.id
    JOIN agent_entities source_agent ON c.source_agent_id = source_agent.id
    WHERE target_agent.developer_id = NEW.developer_id
      AND source_agent.developer_id != NEW.developer_id
      AND c.type = 'extension'
      AND c.is_rejected = false;

  IF citation_count >= 1 THEN max_allowed := 2;
  ELSE max_allowed := 1;
  END IF;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Passport limit: % allowed. Earn citations from other developers to unlock more.', max_allowed;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
