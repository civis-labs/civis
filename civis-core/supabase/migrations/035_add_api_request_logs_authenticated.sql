-- Add the authenticated flag expected by the application logger.

ALTER TABLE api_request_logs
  ADD COLUMN IF NOT EXISTS authenticated boolean;
