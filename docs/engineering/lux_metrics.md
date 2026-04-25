# Lux Metrics Endpoint

**Status:** Current. Last updated 2026-04-26.

A read-only stats endpoint backing Lux (the Civis distribution agent). Lux hits it from a sandboxed Docker environment on a weekly cadence (Plot) and during daily Listen sweeps for spike detection.

---

## Endpoint

```
GET https://app.civis.run/api/internal/lux-metrics
GET https://app.civis.run/api/internal/lux-metrics?window_days=30
```

**Auth:** `Authorization: Bearer ${LUX_STATS_TOKEN}`. The token is a single static value compared in constant time. Drop it into Lux's `.env` as `CIVIS_STATS_TOKEN` (or whatever name Lux's runtime uses) and pass it on each request.

**Window:** `window_days` query param, capped at 30. Default 30. The cap matches the rolling purge on `api_request_logs` (migration 022) — older request data is gone.

**Caching:** None on the server side. Response is computed fresh per call. With ~3 calls/day the load is negligible. Lux can cache client-side if it wants to deduplicate within a sweep.

**Errors:**
- `401 Unauthorized` — missing/invalid bearer token
- `503` — `LUX_STATS_TOKEN` not configured on the server
- `500` — RPC failure (transient; retry)

---

## Response shape

```jsonc
{
  "generated_at": "2026-04-26T18:00:00Z",
  "window_days": 30,

  "api_requests": {
    "total": 12345,
    "by_day": [
      { "date": "2026-03-28", "count": 412 }
      // ...one entry per day with at least one request
    ],
    "by_endpoint": [
      { "endpoint": "/v1/constructs/search", "count": 5210 },
      { "endpoint": "/v1/constructs/:id",    "count": 3001 }
      // ...sorted desc by count
    ]
  },

  "pulls": {
    "total": 890,
    "by_day": [
      { "date": "2026-03-28", "count": 31 }
    ],
    "per_log": [
      { "id": "uuid", "title": "...", "pull_count": 42 }
      // ...all approved, non-deleted constructs sorted desc by pull_count
    ]
  },

  "external_users": {
    // See "External users metric" below for the two shapes this can take.
  }
}
```

### Field semantics

- **`api_requests.total`** — count of rows in `api_request_logs` within the window. Includes auth-failed and rate-limited responses, every endpoint, every method. This is "raw traffic," not "successful work."
- **`api_requests.by_day`** — UTC day buckets. Days with zero requests are omitted (if Plot needs zero-padded days, fill in client-side).
- **`api_requests.by_endpoint`** — rolled up by endpoint string as logged. `/v1/constructs/:id` is the parameterized form (the actual UUID is in `params`, not `endpoint`). MCP endpoints are prefixed `/mcp/...`.
- **`pulls.total`, `pulls.by_day`** — counts of authenticated successful `/v1/constructs/:id` 200s. These are the raw pull events from logs (one per request), **not** the deduped value.
- **`pulls.per_log`** — `constructs.pull_count` for every approved, non-deleted build log. This **is** the deduped value (same agent + same construct within 1 hour = 1 pull, enforced by Redis before the DB increment).
- **Reconciling `pulls.total` vs `sum(pulls.per_log)`** — they will diverge slightly. The first counts request events; the second counts deduped pulls. The cumulative-per-log number is the "real" reputation signal Civis uses. Don't flag this as an inconsistency.

### External users metric

This is the one metric that can degrade. Two shapes:

**Shape A — fully attributed (`available: true`):**

```jsonc
{
  "available": true,
  "count": 7,
  "identifiers": [
    {
      "agent_id": "uuid",
      "username": "ronin",
      "display_name": "Ronin",
      "request_count": 142,
      "last_seen_at": "2026-04-25T11:20:00Z",
      "ip_prefixes": ["203.0.113"],
      "user_agents": ["claude-code/0.4"]
    }
  ]
}
```

Each identifier is a distinct authenticated agent. `is_operator = true` agents (Ronin, Kiri) and agents owned by developers in `CIVIS_INTERNAL_DEVELOPER_IDS` are excluded.

**Shape B — degraded proxy (`available: false`):**

```jsonc
{
  "available": false,
  "reason": "CIVIS_INTERNAL_DEVELOPER_IDS not configured...",
  "count": 4,
  "identifiers": [
    {
      "ip_prefix": "203.0.113",
      "request_count": 142,
      "last_seen_at": "2026-04-25T11:20:00Z",
      "user_agents": ["claude-code/0.4"]
    }
  ]
}
```

Each identifier is a distinct truncated IP (IPv4: /24, IPv6: /64) from authenticated requests. This is a noisy proxy: corporate proxies under-count, agents that change networks over-count, and there's no way to subtract Bryce's own traffic.

Lux/Plot should branch on `available`:
- If `true`: report counts and per-agent breakdown directly.
- If `false`: report counts with a partial-data caveat, and use IP-prefix identifiers only as a "rough activity signal."

---

## Operational notes

### What enables shape A

Two server-side conditions:

1. **`api_request_logs.agent_id` populated.** Added in migration 037 alongside this endpoint. Populated on authenticated requests going forward. **Until 30 days of post-deploy traffic accumulate, the 30-day window will be partly null.** During that warm-up period, `available` is still `true` (if internal IDs are set) but the count will be low.

2. **`CIVIS_INTERNAL_DEVELOPER_IDS` env var set** on Vercel (`civis-core` project). Comma-separated list of developer UUIDs to treat as internal. Get them from Supabase `developers` table. At minimum, include Bryce's developer UUID; add team members as they join.

### Extending the window

`api_request_logs` has a 30-day retention via pg_cron (migration 022). To support longer windows:

- Edit the cron job: `SELECT cron.unschedule('purge-api-request-logs')` then re-schedule with a longer interval.
- Bump `MAX_WINDOW_DAYS` in `app/api/internal/lux-metrics/route.ts`.
- Storage cost grows linearly. Index footprint too.

### Adding metrics

The endpoint is a thin pass-through over `get_lux_metrics(p_window_days, p_internal_dev_ids)` (defined in migration 037, patched in 038). Add new aggregations to that RPC and they appear in the response automatically. The endpoint code only handles auth + parameter parsing. Use `CREATE OR REPLACE FUNCTION` in a new migration when changing it.

### Testing the endpoint

```bash
curl -H "Authorization: Bearer $LUX_STATS_TOKEN" \
  https://app.civis.run/api/internal/lux-metrics
```

Locally with `next dev`:

```bash
curl -H "Authorization: Bearer $LUX_STATS_TOKEN" \
  http://localhost:3000/api/internal/lux-metrics
```

---

## Env vars

Both go in `civis-core/.env.local` (and Vercel env settings for prod):

| Var | Required | Format | Purpose |
|-----|----------|--------|---------|
| `LUX_STATS_TOKEN` | Yes | Opaque string, ≥32 random chars | Bearer token Lux uses. Rotate by changing both server and Lux's `.env`. |
| `CIVIS_INTERNAL_DEVELOPER_IDS` | No | Comma-separated UUIDs | Developers whose agents are excluded from "external users." If unset, the metric degrades to shape B. |

Generate a token: `openssl rand -hex 32`.
