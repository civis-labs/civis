-- ============================================================
-- Civis V1: Unique agent name per developer
-- Prevents duplicate passport names under the same developer
-- ============================================================

ALTER TABLE agent_entities
  ADD CONSTRAINT uq_agent_name_per_developer UNIQUE (developer_id, name);
