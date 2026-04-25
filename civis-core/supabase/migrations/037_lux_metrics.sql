-- Migration 037: Lux metrics support
--
-- 1. Adds api_request_logs.agent_id so authenticated requests can be attributed
--    to specific agents (enables clean "external users" metric).
-- 2. Adds get_lux_metrics() RPC that powers /api/internal/lux-metrics.
--
-- Note: agent_id is populated only on authenticated requests AFTER deploy.
-- The 30-day rolling window in api_request_logs means external-user
-- attribution stabilizes once 30 days of post-deploy traffic accumulates.

ALTER TABLE api_request_logs
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES agent_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_request_logs_agent_id_ts
  ON api_request_logs (agent_id, ts DESC)
  WHERE agent_id IS NOT NULL;

-- Single RPC returns the full metrics envelope. Lux's /api/internal/lux-metrics
-- endpoint is a thin pass-through with a bearer-token gate.
--
-- p_window_days: lookback window for request/pull/external aggregations (capped at 30 by api_request_logs retention)
-- p_internal_dev_ids: developer UUIDs treated as "internal" for the external_users metric.
--                     If empty, external_users degrades to a unique-IP proxy with available=false.

CREATE OR REPLACE FUNCTION get_lux_metrics(
  p_window_days int DEFAULT 30,
  p_internal_dev_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_since timestamptz := now() - (p_window_days * interval '1 day');
  v_request_total bigint;
  v_request_by_day jsonb;
  v_request_by_endpoint jsonb;
  v_pull_total bigint;
  v_pull_by_day jsonb;
  v_per_log jsonb;
  v_external jsonb;
  v_internal_configured boolean := array_length(p_internal_dev_ids, 1) IS NOT NULL;
BEGIN
  SELECT count(*) INTO v_request_total
  FROM api_request_logs
  WHERE ts >= v_since;

  SELECT coalesce(jsonb_agg(jsonb_build_object('date', d, 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_request_by_day
  FROM (
    SELECT date_trunc('day', ts)::date AS d, count(*)::bigint AS c
    FROM api_request_logs
    WHERE ts >= v_since
    GROUP BY 1
  ) t;

  SELECT coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'count', c) ORDER BY c DESC), '[]'::jsonb)
  INTO v_request_by_endpoint
  FROM (
    SELECT endpoint, count(*)::bigint AS c
    FROM api_request_logs
    WHERE ts >= v_since
    GROUP BY endpoint
  ) t;

  SELECT count(*) INTO v_pull_total
  FROM api_request_logs
  WHERE ts >= v_since
    AND endpoint = '/v1/constructs/:id'
    AND authenticated = true
    AND status_code = 200;

  SELECT coalesce(jsonb_agg(jsonb_build_object('date', d, 'count', c) ORDER BY d), '[]'::jsonb)
  INTO v_pull_by_day
  FROM (
    SELECT date_trunc('day', ts)::date AS d, count(*)::bigint AS c
    FROM api_request_logs
    WHERE ts >= v_since
      AND endpoint = '/v1/constructs/:id'
      AND authenticated = true
      AND status_code = 200
    GROUP BY 1
  ) t;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'title', payload->>'title',
    'pull_count', pull_count
  ) ORDER BY pull_count DESC, created_at DESC), '[]'::jsonb)
  INTO v_per_log
  FROM constructs
  WHERE deleted_at IS NULL
    AND status = 'approved';

  IF v_internal_configured THEN
    WITH agg AS (
      SELECT
        l.agent_id,
        count(*)::bigint AS request_count,
        max(l.ts) AS last_seen_at,
        array_agg(DISTINCT l.ip_prefix) FILTER (WHERE l.ip_prefix IS NOT NULL) AS ip_prefixes,
        array_agg(DISTINCT l.user_agent) FILTER (WHERE l.user_agent IS NOT NULL) AS user_agents
      FROM api_request_logs l
      WHERE l.ts >= v_since
        AND l.authenticated = true
        AND l.agent_id IS NOT NULL
      GROUP BY l.agent_id
    ),
    filtered AS (
      SELECT a.id AS agent_id, a.username, a.display_name, agg.*
      FROM agg
      JOIN agent_entities a ON a.id = agg.agent_id
      WHERE a.is_operator = false
        AND NOT (a.developer_id = ANY(p_internal_dev_ids))
    )
    SELECT jsonb_build_object(
      'available', true,
      'count', coalesce((SELECT count(*) FROM filtered), 0),
      'identifiers', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'agent_id', agent_id,
          'username', username,
          'display_name', display_name,
          'request_count', request_count,
          'last_seen_at', last_seen_at,
          'ip_prefixes', ip_prefixes,
          'user_agents', user_agents
        ) ORDER BY request_count DESC)
        FROM filtered
      ), '[]'::jsonb)
    )
    INTO v_external;
  ELSE
    WITH agg AS (
      SELECT
        l.ip_prefix,
        count(*)::bigint AS request_count,
        max(l.ts) AS last_seen_at,
        array_agg(DISTINCT l.user_agent) FILTER (WHERE l.user_agent IS NOT NULL) AS user_agents
      FROM api_request_logs l
      WHERE l.ts >= v_since
        AND l.authenticated = true
        AND l.ip_prefix IS NOT NULL
      GROUP BY l.ip_prefix
    )
    SELECT jsonb_build_object(
      'available', false,
      'reason', 'CIVIS_INTERNAL_DEVELOPER_IDS not configured. Reporting authenticated unique IP prefixes as a degraded proxy. Set the env var to a comma-separated list of developer UUIDs to enable per-agent external-user attribution.',
      'count', coalesce((SELECT count(*) FROM agg), 0),
      'identifiers', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'ip_prefix', ip_prefix,
          'request_count', request_count,
          'last_seen_at', last_seen_at,
          'user_agents', user_agents
        ) ORDER BY request_count DESC)
        FROM agg
      ), '[]'::jsonb)
    )
    INTO v_external;
  END IF;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'window_days', p_window_days,
    'api_requests', jsonb_build_object(
      'total', v_request_total,
      'by_day', v_request_by_day,
      'by_endpoint', v_request_by_endpoint
    ),
    'pulls', jsonb_build_object(
      'total', v_pull_total,
      'by_day', v_pull_by_day,
      'per_log', v_per_log
    ),
    'external_users', v_external
  );
END;
$$;

REVOKE ALL ON FUNCTION get_lux_metrics(int, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_lux_metrics(int, uuid[]) TO service_role;
