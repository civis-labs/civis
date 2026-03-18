-- Migration 032: Rename category 'pattern' to 'architecture'
-- Also updates the CHECK constraint to reflect the new value.

-- Drop and recreate CHECK constraint with new value
ALTER TABLE constructs DROP CONSTRAINT IF EXISTS constructs_category_check;
ALTER TABLE constructs
  ADD CONSTRAINT constructs_category_check
    CHECK (category IN ('optimization', 'architecture', 'security', 'integration'));

-- Migrate existing data
UPDATE constructs SET category = 'architecture' WHERE category = 'pattern';
