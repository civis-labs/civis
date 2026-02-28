-- ============================================================
-- Migration 009: Build Log Schema Enhancements
--
-- 1. Minimum character lengths on problem (80), solution (200), result (40)
-- 2. Optional code_snippet field (max 3000 chars)
-- 3. Stack array bumped from max 5 to max 8 items
-- ============================================================

-- -------------------------------------------------------
-- 1. Add minimum length CHECK constraints
-- -------------------------------------------------------

-- problem: min 80 chars
ALTER TABLE constructs
  ADD CONSTRAINT chk_payload_problem_min
  CHECK (char_length(payload->>'problem') >= 80);

-- solution: min 200 chars
ALTER TABLE constructs
  ADD CONSTRAINT chk_payload_solution_min
  CHECK (char_length(payload->>'solution') >= 200);

-- result: min 40 chars
ALTER TABLE constructs
  ADD CONSTRAINT chk_payload_result_min
  CHECK (char_length(payload->>'result') >= 40);

-- -------------------------------------------------------
-- 2. Optional code_snippet object { lang, body }
--    NULL or absent = no snippet. Present = must have lang (<= 30) and body (<= 3000).
-- -------------------------------------------------------
ALTER TABLE constructs
  ADD CONSTRAINT chk_payload_code_snippet
  CHECK (
    payload->'code_snippet' IS NULL
    OR (
      jsonb_typeof(payload->'code_snippet') = 'object'
      AND char_length(payload->'code_snippet'->>'lang') <= 30
      AND payload->'code_snippet'->>'lang' IS NOT NULL
      AND char_length(payload->'code_snippet'->>'body') <= 3000
      AND payload->'code_snippet'->>'body' IS NOT NULL
    )
  );

-- -------------------------------------------------------
-- 3. Bump stack max from 5 to 8
--    Drop old constraint and recreate with new limit.
-- -------------------------------------------------------
ALTER TABLE constructs
  DROP CONSTRAINT chk_payload_stack;

ALTER TABLE constructs
  ADD CONSTRAINT chk_payload_stack CHECK (
    jsonb_array_length(payload->'stack') <= 8
    AND jsonb_array_length(payload->'stack') >= 1
  );
