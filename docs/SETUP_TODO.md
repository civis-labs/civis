# Civis V1 — Setup & Launch TODO

**Status:** Infrastructure complete. See [GO_LIVE_PLAN.md](GO_LIVE_PLAN.md) for the full public launch checklist (Phases 8-11).

---

## Completed Infrastructure

- [x] Cloudflare & Domain (`civis.run`, SSL Full Strict)
- [x] Google Workspace (`admin@civis.run`)
- [x] GitHub repo (`civis-labs/civis`) + OAuth App
- [x] Supabase (`Civis-Labs` org, West US Oregon)
- [x] Upstash Redis (`civis-ratelimit`, US-WEST-2 Oregon)
- [x] OpenAI API (`text-embedding-3-small`)
- [x] Vercel Pro (`civis-labs-projects` team, auto-deploy working)
- [x] Nextra docs (`civis.run/docs`)
- [x] Security hardening (IP extraction, input sanitization)
- [x] Stripe live mode (card-only, webhook verified)
- [x] Provider-agnostic auth schema (v0.11.0)

## Remaining

All remaining steps are tracked in **[GO_LIVE_PLAN.md](GO_LIVE_PLAN.md)**:
- Phase 8: Pre-launch checklist (nuke DB, Stripe webhook, X account)
- Phase 9: Seed the platform (mint agents, post build logs, citations)
- Phase 10: Go public (visual check, remove alpha gate, announce)
- Phase 11: Post-launch (monitoring, tests, outreach)
