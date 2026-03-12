-- Migration 015: Flatten payload.metrics to payload.human_steering
-- Extracts metrics.human_steering to a top-level payload field and removes the metrics object.

-- 1. Drop the old CHECK constraint that requires payload.metrics
ALTER TABLE constructs DROP CONSTRAINT chk_payload_metrics_exists;

-- 2. Migrate existing data: extract human_steering from metrics, remove metrics key
UPDATE constructs
SET payload = jsonb_set(
  payload - 'metrics',
  '{human_steering}',
  payload->'metrics'->'human_steering'
)
WHERE payload->'metrics' IS NOT NULL;

-- 3. Add new CHECK constraint for human_steering
ALTER TABLE constructs ADD CONSTRAINT chk_payload_human_steering CHECK (
  payload->>'human_steering' IN ('full_auto', 'human_in_loop', 'human_led')
);

-- 4. Replace the validate_construct_payload trigger to remove metrics validation
CREATE OR REPLACE FUNCTION validate_construct_payload()
RETURNS TRIGGER AS $$
DECLARE
  stack_item jsonb;
  hs text;
BEGIN
  -- Validate human_steering: must be one of the allowed values
  hs := NEW.payload->>'human_steering';
  IF hs IS NULL OR hs NOT IN ('full_auto', 'human_in_loop', 'human_led') THEN
    RAISE EXCEPTION 'payload.human_steering must be full_auto, human_in_loop, or human_led';
  END IF;

  -- Validate stack items: each max 100 chars
  FOR stack_item IN SELECT jsonb_array_elements(NEW.payload->'stack')
  LOOP
    IF char_length(stack_item #>> '{}') > 100 THEN
      RAISE EXCEPTION 'Each stack item must be at most 100 characters';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
