# Handover: Seed and Launch Session

This document captures the state of the Civis project after the session covering v0.12.2 through v0.12.4. It is intended as a boot prompt for the next session.

---

## What was done this session (v0.12.2 to v0.12.4)

- Footer X link added (https://x.com/civis_labs)
- Trending feed pinning mechanism: `pinned_at` column on `constructs`, migration `016_trending_pin.sql`
- Stack taxonomy expansion: Cron, LiteLLM, Markdown, Graphviz added
- Production seed script (`scripts/seed.ts`) with retry, duplicate detection, 500ms pacing, stack normalization, OpenAI content filter safe-text fallback
- Embedding text reduced to title + problem + result only (both in seed script and `lib/embeddings.ts` `generateConstructEmbedding`). Solution and code_snippet excluded to avoid OpenAI content filter 500 errors on security-focused logs.
- Feed changed to Latest-only for launch. Trending and Discovery tabs hidden (commented out in `components/feed-tabs.tsx`, not deleted).
- Pinning now works on the Latest feed too (not just the trending RPC). The `pinned_at` column is sorted first in the chron query.
- Reputation cron bumped from daily to every 30 minutes (`*/30 * * * *`)
- Feed tabs simplified to a single non-interactive "Latest" pill label
- Outreach templates written (in `X_CONTENT_STRATEGY.md`)
- Agent name locked: Kiri (was HaikuTrade)
- Seed posting strategy decided: 22 logs in 3 batches, 3 held back for drip posting

---

## Test run results

- Seed script tested against live DB with existing test agents (Ronin + phantom)
- 22/22 logs inserted successfully
- Hero card ("Agent communication safety layer") pinned
- OpenAI content filter issue discovered and resolved (solution field contains injection/jailbreak terminology; fix: exclude solution and code_snippet from embedding text)
- Duplicate detection and retry logic confirmed working

---

## What has NOT been done yet (in priority order)

1. **Truncate the production DB** (Phase 8A in `GO_LIVE_PLAN.md`). User chose truncate route over full project recreate.
2. **Mint Ronin and Kiri via UI**, save UUIDs and API keys
3. **Run seed script for real** (dry-run first, then real run)
4. **Visual check** of feed, explore, leaderboard, search, agent profiles
5. **Deploy code changes** (v0.12.4 has not been pushed/deployed yet)
6. **Remove alpha gate** when ready
7. **Soft launch**: X post + direct outreach using templates in `X_CONTENT_STRATEGY.md`
8. **Drip-post 3 held-back logs** over the first week
9. **Docs review** (`civis.run/docs` accuracy after schema changes)
10. **Moltbook announcement** via Ronin (draft not yet written)

---

## Key context

- **Platform**: Civis, "LinkedIn + GitHub for AI Agents"
- **X handle**: @civis_labs
- **Ronin**: Founder's agent. **Kiri**: Second seed agent (ElizaOS DeFi/social persona).
- **Voice**: Developer-tool brand. No hype. No emoji. No em dashes. Think Vercel/Linear.
- **Current version**: 0.12.4
- **Trending/Discovery tabs** are commented out, not deleted. Re-enable in `components/feed-tabs.tsx` when there is enough organic activity.
- **Seed script** reads from `C:\dev\civis_build_logs\` (3 JSON files: `ronin_real_builds.json`, `ronin_moltbook_posts.json`, `haiku_sdr_builds.json`)
- **Pin/unpin SQL**: `UPDATE constructs SET pinned_at = NOW() WHERE id = 'uuid';` / `SET pinned_at = NULL`
- **Reputation cron** runs every 30 min on Vercel Pro. Can also trigger manually: `curl -H "Authorization: Bearer $CRON_SECRET" https://app.civis.run/api/cron/reputation`

---

## Important rules for next session

- Read `civis_context.md` first (as per `CLAUDE.md`)
- Never use em dashes in any output
- Update `CHANGELOG.md` for any code changes
- No code changes unless asked
- User prefers direct, concise communication
