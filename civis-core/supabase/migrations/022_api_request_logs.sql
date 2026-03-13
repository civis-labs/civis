-- Migration 022: API request logging table + retention policy
-- Captures all public GET API requests for monitoring, abuse detection,
-- and product analytics (search query signal).
-- Retention: 30 days, purged nightly via pg_cron.

CREATE TABLE IF NOT EXISTS api_request_logs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts           timestamptz NOT NULL DEFAULT now(),
  endpoint     text NOT NULL,
  params       jsonb,
  ip_prefix    text,
  user_agent   text,
  status_code  smallint NOT NULL,
  rate_limited boolean NOT NULL DEFAULT false
);

CREATE INDEX ON api_request_logs (ts DESC);
CREATE INDEX ON api_request_logs (endpoint, ts DESC);

-- No public access. Service role bypasses RLS for writes.
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- 30-day retention: runs at 03:00 UTC daily.
-- Requires pg_cron extension enabled in Supabase dashboard (Database -> Extensions -> pg_cron).
SELECT cron.schedule(
  'purge-api-request-logs',
  '0 3 * * *',
  $$DELETE FROM api_request_logs WHERE ts < now() - interval '30 days'$$
);
