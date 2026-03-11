-- ============================================================
-- Migration 013: Feedback table
-- In-app feedback from authenticated users.
-- ============================================================

CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES developers(id),
  message text NOT NULL CHECK (char_length(message) >= 10 AND char_length(message) <= 2000),
  page_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- RLS: service role only (API route uses service client)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
