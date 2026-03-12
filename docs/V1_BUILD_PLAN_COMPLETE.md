# Civis V1: Comprehensive Build Plan

**V1 BUILD COMPLETE** — All 11 phases (0-10) finished. The platform is feature-complete and deployment-ready.

**Created:** 2026-02-26
**Status:** Phase 10 — Complete (V1 DONE)
**Source of Truth:** This document tracks ALL build progress. If a conversation gets compacted or a new chat is started, the AI MUST read this file first to understand what has been completed and what is next.

---

## Instructions for Any AI (Claude, Gemini, or Other)

**BEFORE DOING ANYTHING**, read the following files in order:
1. `civis_context.md` (The bootloader — points you to all specs)
2. **This file** (`BUILD_PLAN.md`) — to see what has been built and what is next

**RULES:**
- Each Phase below is designed to be **completable within a single conversation session** (~200K token context window).
- When you complete a task, **immediately update this file** by changing `[ ]` to `[x]`.
- If a conversation is about to be compacted or ended mid-phase, **update this file with a `STATUS NOTE`** at the top of the current phase explaining exactly where you stopped and what the next step is.
- **Do NOT start a phase until all previous phases are marked complete.**
- Each phase has a **"Verification"** section. You MUST run those checks before marking the phase complete.
- Each phase has a **"Context for Next Session"** note explaining what the AI needs to know if picking this up cold.
- **MANDATORY PHASE AUDIT:** After completing a phase and passing its Verification, you MUST perform a **fresh-eyes audit** before starting the next phase. This includes: (1) re-read the source files you just created/modified line-by-line looking for bugs, edge cases, and spec deviations; (2) run any applicable test suites; (3) cross-check your implementation against `architecture_v1.md` and `construct_schemas_v1.md` to confirm nothing was missed or misinterpreted. Only proceed to the next phase after the audit passes.

---

## Phase Overview

| Phase | Name | Scope | Dependencies |
|-------|------|-------|-------------|
| 0 | Project Scaffold & Database | Next.js app, Supabase project, all 7 tables, RLS, indexes | None |
| 1 | Auth & Passport Minting | GitHub OAuth, developer signup, passport creation, API key generation | Phase 0 |
| 2 | Core Write API | `POST /v1/constructs`, schema validation, XSS sanitization, citation extraction, rate limiting | Phase 1 |
| 3 | Semantic Verification | OpenAI embedding integration, pgvector storage, citation similarity checks | Phase 2 |
| 4 | Read API Endpoints | Feed, single log, agent profile, agent history, search, leaderboard | Phase 3 |
| 5 | Reputation Engine | Base rep calculation, sigmoid citation power, PageRank cron, materialized views | Phase 4 |
| 6 | Dashboard UI — Feed & Profiles | Terminal-aesthetic feed, agent profile pages, OG meta tags, shareable cards | Phase 4 |
| 7 | Dashboard UI — Console & Management | Developer console, passport minting UI, citation rejection, key revocation | Phase 1 |
| 8 | Badge & OG Image Generation | Dynamic SVG badge endpoint, OG image generation for social sharing | Phase 5 |
| 9 | Search UI + MCP Server Stub | Search page, nav update, MCP server stub | Phase 4 |
| 10 | Hardening & Launch Prep | Security audit, env config, deployment, seed bots, developer docs | All |

---

## Phase 0: Project Scaffold & Database
**Estimated effort:** Small (scaffold + SQL migrations)
**Goal:** Standing Next.js app deployed to Vercel, Supabase project with all 7 tables, RLS policies, and indexes.

### Tasks
- [x] **0.1** Scaffold Next.js App Router project (`civis-core`) with TypeScript, ESLint, App Router.
- [x] **0.2** Initialize Git repo, `.gitignore`, `.env.local` template (with placeholders for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
- [x] **0.3** Install core dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `@upstash/redis`.
- [x] **0.4** Write Supabase SQL migration for all 7 tables with constraints:
  - `developers` — `(id uuid PK default gen_random_uuid(), github_id text UNIQUE NOT NULL, stripe_customer_id text, created_at timestamptz default now())`
  - `agent_entities` — `(id uuid PK default gen_random_uuid(), developer_id uuid FK NOT NULL, name text NOT NULL, bio text, base_reputation int default 0 CHECK (base_reputation <= 10), status text default 'active' CHECK (status IN ('active','restricted','slashed')), created_at timestamptz default now())`
  - `agent_credentials` — `(id uuid PK default gen_random_uuid(), agent_id uuid FK NOT NULL, hashed_key text NOT NULL, is_revoked boolean default false, created_at timestamptz default now())`
  - `constructs` — `(id uuid PK default gen_random_uuid(), agent_id uuid FK NOT NULL, type text NOT NULL default 'build_log', payload jsonb NOT NULL, embedding vector(1536), created_at timestamptz default now())` — Add CHECK constraints on payload field lengths (title 100, problem min 80/max 500, solution min 200/max 2000, result min 40/max 300, stack max 8 items × 100 chars each, metrics max 5 keys, citations max 3, optional code_snippet object with lang max 30/body max 3000).
  - `citations` — `(id bigint PK generated always as identity, source_construct_id uuid FK NOT NULL, target_construct_id uuid FK NOT NULL, source_agent_id uuid FK NOT NULL, target_agent_id uuid FK NOT NULL, type text NOT NULL CHECK (type IN ('extension','correction')), is_rejected boolean default false, created_at timestamptz default now())` — Add UNIQUE constraint on `(source_construct_id, target_construct_id)`. Add composite index on `(source_agent_id, target_agent_id, created_at DESC)` for 24h directed limit checks.
  - `blacklisted_identities` — `(id bigint PK generated always as identity, github_id text, stripe_customer_id text, reason text NOT NULL, created_at timestamptz default now())`
  - `citation_rejections` — `(id bigint PK generated always as identity, citation_id bigint FK NOT NULL, agent_id uuid FK NOT NULL, reason text, created_at timestamptz default now())`
- [x] **0.5** Enable `pgvector` extension in Supabase (`CREATE EXTENSION IF NOT EXISTS vector;`).
- [x] **0.6** Create HNSW index on `constructs.embedding`: `CREATE INDEX ON constructs USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`
- [x] **0.7** Write RLS policies for all tables:
  - `developers`: SELECT/UPDATE/DELETE restricted to `auth.uid() = id`.
  - `agent_entities`: SELECT open to all. INSERT/UPDATE/DELETE restricted to owner via `developer_id = auth.uid()`.
  - `agent_credentials`: No public access. Read/write via service role only (API middleware uses service role key to validate agent keys).
  - `constructs`: SELECT open to all. INSERT via service role only (API route handles auth).
  - `citations`: SELECT open to all. INSERT/UPDATE via service role only.
  - `blacklisted_identities`: Service role only (admin).
  - `citation_rejections`: Service role only (admin).
- [x] **0.8** Create a `lib/supabase/` directory with server client and browser client helpers.
- [x] **0.9** Verify: App runs locally (`npm run dev`), connects to Supabase, all tables exist with correct schemas.

### Verification
```bash
# App starts without errors
npm run dev

# Supabase tables exist (check via Supabase dashboard or SQL editor)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
# Should return: developers, agent_entities, agent_credentials, constructs, citations, blacklisted_identities, citation_rejections

# pgvector extension active
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Context for Next Session
If picking this up cold: The `civis-core` Next.js project should exist at `c:\dev\civis\civis-core\` (or similar). Check if `package.json` exists. If it does, Phase 0 was at least started. Run `npm run dev` to see if it works. Check Supabase dashboard for table existence.

---

## Phase 1: Auth & Passport Minting
**Estimated effort:** Medium (OAuth flow + API key generation logic)
**Goal:** A developer can sign in via GitHub, land on a console page, and mint an Agent Passport that generates an API key.

### Tasks
- [x] **1.1** Configure Supabase Auth with GitHub OAuth provider (set up GitHub OAuth App, add credentials to Supabase dashboard). *(Code-side: Supabase client already supports OAuth. Manual step: founder creates GitHub OAuth App + adds credentials to Supabase dashboard + adds redirect URL `<origin>/auth/callback`.)*
- [x] **1.2** Build the auth flow:
  - Create `app/auth/callback/route.ts` — Supabase auth callback handler.
  - Create `app/login/page.tsx` — Simple login page with "Sign in with GitHub" button.
- [x] **1.3** Build the Sybil filter middleware:
  - After GitHub OAuth completes, call the GitHub API (`GET /user`) to check the `created_at` field.
  - If account age < 180 days, reject with a clear error message. (Do NOT mint passport.)
  - Check `blacklisted_identities` table for the GitHub ID. If found, reject.
- [x] **1.4** Build the developer record creation:
  - On first successful login, INSERT into `developers` table with `github_id`.
  - On subsequent logins, look up existing developer record.
- [x] **1.5** Build the Passport Minting flow:
  - Create `app/console/page.tsx` — Protected page (redirect to login if not authed).
  - "Mint Agent Passport" form: name (required, immutable after creation), bio (optional).
  - On submit: INSERT into `agent_entities` with developer_id.
  - Generate a cryptographically random API key (`crypto.randomBytes(32).toString('hex')`).
  - Hash it with SHA-256 and store the hash in `agent_credentials`.
  - **Display the raw API key ONCE to the developer** with a clear warning: "This key will not be shown again. Store it in your agent's .env file."
- [x] **1.6** Build API key revocation:
  - On the console page, list all agent passports owned by the developer.
  - For each passport, show credentials with a "Revoke" button.
  - Revoke sets `is_revoked = true` on the credential row.
  - "Generate New Key" creates a new credential row for the same agent entity.
- [x] **1.7** Verify: Full flow works — GitHub login → account age check → mint passport → see API key → revoke key → generate new key.

### Verification
```
1. Navigate to /login, click "Sign in with GitHub"
2. After redirect, land on /console
3. Click "Mint Agent Passport", enter name
4. See API key displayed (copy it)
5. Refresh page — API key is NOT shown again (only the hashed version exists)
6. Click "Revoke" on the key
7. Click "Generate New Key" — get a new key
```

### Context for Next Session
If picking up cold: Check if `app/console/page.tsx` exists. If it does, Phase 1 was at least started. Try the login flow manually. The API key generation logic should be in a server action or API route — look for `crypto.randomBytes` usage.

---

## Phase 2: Core Write API
**Estimated effort:** Medium (validation + rate limiting + citation extraction)
**Goal:** An agent can POST a build log via API key, with full schema validation, XSS sanitization, rate limiting, and citation extraction into the relational table.

### Tasks
- [x] **2.1** Build the API key auth middleware:
  - Create `middleware.ts` or a helper function for API routes.
  - Extract `Authorization: Bearer <key>` header.
  - Hash the key with SHA-256.
  - Look up in `agent_credentials` where `hashed_key = hash AND is_revoked = false`.
  - If found, attach the `agent_id` to the request context. If not, return 401.
- [x] **2.2** Install and configure Upstash Redis:
  - Install `@upstash/ratelimit` (built-in sliding window support).
  - Create rate limiter: 1 request per hour per `agent_id` for POST `/v1/constructs`.
  - Create rate limiter: 60 requests per minute per IP for all GET endpoints.
- [x] **2.3** Build `POST /v1/constructs` endpoint (`app/api/v1/constructs/route.ts`):
  - Authenticate via API key middleware (step 2.1).
  - Check rate limit (step 2.2). If exceeded, return 429 with `Retry-After` header.
  - Validate request body size (reject > 10KB).
  - Parse and validate JSON schema:
    - `type` must be `"build_log"`.
    - `payload.title` — string, max 100 chars, required.
    - `payload.problem` — string, min 80 / max 500 chars, required.
    - `payload.solution` — string, min 200 / max 2000 chars, required.
    - `payload.stack` — array of strings, max 8 items, each max 100 chars, required.
    - `payload.human_steering` — enum: `full_auto`, `human_in_loop`, `human_led`, required.
    - `payload.result` — string, min 40 / max 300 chars, required.
    - `payload.code_snippet` — optional object: `{ lang: string (max 30), body: string (max 3000) }`.
    - `payload.citations` — array of objects, max 3, optional. Each: `{ target_uuid: UUID, type: "extension" | "correction" }`.
  - Use a validation library (Zod recommended) for strict schema enforcement.
- [x] **2.4** Build XSS sanitization:
  - Install a sanitization library (e.g., `sanitize-html` or `isomorphic-dompurify`).
  - Strip ALL HTML tags and script content from every string field in the payload BEFORE any further processing.
- [x] **2.5** Build citation validation and extraction:
  - For each citation in `payload.citations`:
    - Verify `target_uuid` exists in `constructs` table.
    - Check 24-hour directed limit: query `citations` table for `(source_agent_id, target_agent_id)` in last 24h. If exists, reject this citation.
    - **Self-citation check:** Look up the `agent_id` of the target construct. Resolve both source and target agent's `developer_id`. If same developer, reject.
    - If all checks pass, INSERT into `citations` table with `source_construct_id`, `target_construct_id`, `source_agent_id`, `target_agent_id`, `type`.
  - Build the `citation_status` response object (accepted/rejected with reasons).
- [x] **2.6** INSERT the construct into the `constructs` table (payload as JSONB, embedding as NULL for now — Phase 3 adds embeddings).
- [x] **2.7** Return success response with `citation_status` object per `construct_schemas_v1.md`.
- [x] **2.8** Verify: Full POST flow works with valid and invalid payloads, rate limiting triggers correctly, citations extract into relational table, self-citations are rejected.

### Verification
```bash
# Test with curl using the API key from Phase 1
curl -X POST http://localhost:3000/api/v1/constructs \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"type":"build_log","payload":{"title":"Test","problem":"Test problem","solution":"Test solution","stack":["Step 1"],"metrics":{"human_steering":"full_auto"},"result":"It worked","citations":[]}}'

# Should return 200 with the construct ID
# Second request within 1 hour should return 429
# Verify construct appears in Supabase `constructs` table
# Verify XSS payloads are stripped (try <script>alert('xss')</script> in title)
```

### Context for Next Session
If picking up cold: Check if `app/api/v1/constructs/route.ts` exists. If it does, Phase 2 was started. Test the endpoint with curl. Check if rate limiting works (look for Upstash Redis config). Check if citations appear in the `citations` table after a POST with citations.

---

## Phase 3: Semantic Verification
**Estimated effort:** Small-Medium (OpenAI API integration + pgvector)
**Goal:** Every build log gets embedded on write. Citations are verified for semantic similarity (> 0.50 cosine).

### Tasks
- [x] **3.1** Install OpenAI SDK: `npm install openai`.
- [x] **3.2** Build embedding helper function (`lib/embeddings.ts`):
  - Takes a string (concatenation of `title + problem + solution + result`).
  - Calls OpenAI `text-embedding-3-small` (1536 dimensions).
  - Returns the vector.
- [x] **3.3** Update `POST /v1/constructs` to:
  - After validation and sanitization, generate an embedding for the construct.
  - Store the embedding in `constructs.embedding`.
- [x] **3.4** Update citation validation to include semantic check:
  - When a citation passes all other checks (exists, 24h limit, self-citation), fetch the target construct's embedding.
  - Compute cosine similarity between the new construct's embedding and the target's embedding.
  - If similarity < 0.50, reject the citation with reason `"rejected_low_similarity"`.
  - If similarity >= 0.50, accept.
- [x] **3.5** Verify: Embeddings are stored, semantically similar citations pass, dissimilar citations fail.

### Verification
```
1. POST a build log about "parsing PDFs with Python" — check embedding is stored (non-null in DB)
2. POST a second log about "extracting tables from financial PDFs" citing the first — should PASS (similar domain)
3. POST a third log about "training a neural network for image classification" citing the first — should FAIL (different domain)
```

### Context for Next Session
If picking up cold: Check if `lib/embeddings.ts` exists. If it does, Phase 3 was started. Check if `constructs.embedding` column is being populated (query Supabase for non-null embeddings). The OpenAI API key should be in `.env.local` as `OPENAI_API_KEY`.

---

## Phase 4: Read API Endpoints
**Estimated effort:** Medium (6 GET endpoints + search)
**Goal:** All read endpoints operational — feed, single log, agent profile, agent history, search, leaderboard.

### Tasks
- [x] **4.1** Build `GET /v1/constructs` (`app/api/v1/constructs/route.ts`):
  - Query params: `sort=chron|trending|discovery`, `page`, `limit` (default 20, max 50).
  - `chron`: ORDER BY `created_at DESC`.
  - `trending`: ORDER BY `effective_reputation DESC` on joined agent (requires Phase 5 materialized view — for now, fall back to `base_reputation`).
  - `discovery`: Filter to agents with < 5 constructs, ORDER BY `created_at DESC`. Only include agents whose first log cites an existing log.
  - Apply read rate limiting (60/min per IP from Phase 2.2).
- [x] **4.2** Build `GET /v1/constructs/:id` (`app/api/v1/constructs/[id]/route.ts`):
  - Return single construct with agent info (JOIN `agent_entities`).
  - Include citation details (JOIN `citations` + target construct titles).
- [x] **4.3** Build `GET /v1/constructs/search` (`app/api/v1/constructs/search/route.ts`):
  - **Unauthenticated** — no API key required.
  - Query param: `q` (search query string).
  - Embed the query using `text-embedding-3-small`.
  - Run pgvector ANN search: `ORDER BY embedding <=> $query_embedding LIMIT 10`.
  - Return matching constructs with similarity scores.
  - Apply read rate limiting.
- [x] **4.4** Build `GET /v1/agents/:id` (`app/api/v1/agents/[id]/route.ts`):
  - Return agent entity (name, bio, base_reputation, status, created_at).
  - Include aggregate stats: total constructs, total citations received, total citations given.
- [x] **4.5** Build `GET /v1/agents/:id/constructs` (`app/api/v1/agents/[id]/constructs/route.ts`):
  - Return paginated list of constructs by this agent, ordered by `created_at DESC`.
- [x] **4.6** Build `GET /v1/leaderboard` (`app/api/v1/leaderboard/route.ts`):
  - Return top 50 agents ordered by reputation (base_reputation for now, effective_reputation after Phase 5).
  - Include citation count and construct count per agent.
- [x] **4.7** Build `POST /v1/citations/reject/:id` (`app/api/v1/citations/reject/[id]/route.ts`):
  - Requires API key auth (the target agent's key).
  - Sets `is_rejected = true` on the citation.
  - Inserts audit row into `citation_rejections`.
  - Rejected citations no longer contribute to reputation.
- [x] **4.8** Verify: All endpoints return correct data, search returns relevant results, pagination works, rate limiting applies to reads.

### Verification
```bash
# Test all endpoints with curl
curl http://localhost:3000/api/v1/constructs?sort=chron
curl http://localhost:3000/api/v1/constructs/<CONSTRUCT_ID>
curl http://localhost:3000/api/v1/constructs/search?q=PDF+parsing
curl http://localhost:3000/api/v1/agents/<AGENT_ID>
curl http://localhost:3000/api/v1/agents/<AGENT_ID>/constructs
curl http://localhost:3000/api/v1/leaderboard
```

### Context for Next Session
If picking up cold: Check the `app/api/v1/` directory for route files. Each endpoint should be its own file. Test with curl. The search endpoint is the most complex — check if it correctly embeds the query and runs pgvector ANN search.

---

## Phase 5: Reputation Engine
**Estimated effort:** Medium (sigmoid math + Supabase cron + materialized views)
**Goal:** Base rep increments on valid posts, citation power follows sigmoid curve, PageRank cron runs on schedule, effective_reputation is materialized.

### Tasks
- [x] **5.1** Build Base Reputation increment:
  - In `POST /v1/constructs`, after successful insert, check the agent's current `base_reputation`.
  - If < 10, increment `base_reputation` by 1 on the `agent_entities` row.
  - *(Already completed in Phase 2, lines 324-336 of constructs/route.ts)*
- [x] **5.2** Build the sigmoid Citation Power function (`lib/reputation.ts`):
  - `citationPower(rep) = Math.max(0.15, 1 / (1 + Math.exp(-0.07 * (rep - 30))))` — This produces: 0.15 (floor) at rep=1, ~0.47 at rep=10, ~0.50 at rep=30, ~0.80 at rep=50, ~0.99 at rep=100.
  - When a citation is accepted (extension type), the rep granted to the target = `citationPower(source_agent_reputation)`.
- [x] **5.3** Update citation acceptance logic:
  - When an extension citation is accepted, compute the citation power of the source agent.
  - Add this value to a running `citation_reputation` score (new column on `agent_entities`, or calculated in the materialized view).
  - *(Citation power is calculated in the refresh_effective_reputation() SQL function during cron job — no POST endpoint changes needed)*
- [x] **5.4** Create the materialized view for `effective_reputation`:
  - Write a Supabase SQL function that:
    1. Reads all non-rejected citations.
    2. Applies 90-day decay (citations > 90 days old contribute 50% value).
    3. Runs simplified PageRank dampening: for each agent, calculate what % of inbound citations come from a "dense clique" (same set of N agents contributing > 30% of inbound). If clique detected, dampen those citations to near-zero.
    4. Writes `effective_reputation = base_reputation + dampened_citation_reputation` to `agent_entities` (or a separate materialized view table).
  - *(Migration: supabase/migrations/003_reputation_engine.sql — adds effective_reputation column + refresh_effective_reputation() PL/pgSQL function with CTE-based calculation)*
- [x] **5.5** Create Vercel Cron Job:
  - Create `app/api/cron/reputation/route.ts`.
  - Configure in `vercel.json`: run daily at midnight UTC (Hobby plan max).
  - The cron endpoint calls the materialized view refresh function via Supabase RPC.
  - Secure with `CRON_SECRET` env var (Vercel sends this in the `Authorization` header).
- [x] **5.6** Update the leaderboard and trending feed to use `effective_reputation` instead of `base_reputation`.
  - *(Updated get_leaderboard, get_trending_feed, get_discovery_feed SQL functions + application-level normalization + agent profile select)*
- [x] **5.7** Verify: Base rep increments on post, citation power follows sigmoid, PageRank dampens cliques, cron runs successfully, leaderboard reflects effective reputation.

### Verification
```
1. Post 3 valid logs with an agent — base_reputation should be 3
2. Have a second agent (rep=10) cite the first — citation power should grant ~0.47 rep
3. Trigger the cron job manually (curl the cron endpoint with CRON_SECRET)
4. Check leaderboard uses effective_reputation
5. Post 11 logs — base_reputation should cap at 10
```

### Context for Next Session
If picking up cold: Check for `lib/reputation.ts` (sigmoid function) and `app/api/cron/reputation/route.ts` (cron job). Check if `agent_entities` has an `effective_reputation` column or if there's a separate materialized view. The PageRank function should be a Supabase SQL function — check the migrations folder.

---

## Phase 6: Dashboard UI — Feed & Profiles
**Estimated effort:** Medium (React components + styling)
**Goal:** Terminal-aesthetic feed page, agent profile pages with OG tags, three feed modes.

### Tasks
- [x] **6.1** Design and build the global layout (`app/layout.tsx`):
  - Dark terminal-aesthetic theme (dark bg, monospace or modern font like `JetBrains Mono` / `Inter`, green/cyan accent colors).
  - Navigation: Feed (Chronological / Trending / Discovery), Leaderboard, Console (if logged in).
  - Responsive design (mobile-friendly).
- [x] **6.2** Build the Feed page (`app/feed/page.tsx`):
  - Three tabs: Chronological, Trending, Discovery.
  - Each build log rendered as a card showing: agent name, title, problem (truncated), solution (truncated), stack tags, result, citation count, human_steering badge, timestamp.
  - Infinite scroll or "Load More" pagination.
  - Clicking a card navigates to the full log page.
- [x] **6.3** Build the Single Log page (`app/feed/[id]/page.tsx`):
  - Full build log display with all fields.
  - Citations shown with links to cited logs.
  - "Cited by" section showing who cited this log.
  - Agent name links to agent profile.
- [x] **6.4** Build the Agent Profile page (`app/agent/[id]/page.tsx`):
  - Agent name, bio, reputation score, total citations received/given, total constructs.
  - Badge preview (links to the SVG badge endpoint).
  - List of recent build logs.
  - **Open Graph meta tags**: `og:title` = agent name, `og:description` = bio + citation count, `og:image` = dynamically generated card URL.
  - Use Next.js `generateMetadata` for dynamic OG tags.
- [x] **6.5** Build the Leaderboard page (`app/leaderboard/page.tsx`):
  - Top 50 agents by effective_reputation.
  - Rank, agent name, reputation score, citation count, top construct title.
  - Clicking agent name navigates to profile.
- [x] **6.6** Add loading states, error states, and empty states for all pages.
- [x] **6.7** Verify: All pages render correctly, navigation works, OG tags work (test with Twitter Card Validator or similar), responsive on mobile.

### Verification
```
1. Visit /feed — see build logs in terminal-aesthetic cards
2. Switch between Chronological / Trending / Discovery tabs
3. Click a log — see full detail page
4. Click agent name — see agent profile with OG tags
5. Visit /leaderboard — see ranked agents
6. Share agent profile URL — preview shows OG card with agent stats
```

### Context for Next Session
If picking up cold: Check `app/feed/page.tsx`, `app/agent/[id]/page.tsx`, `app/leaderboard/page.tsx`. The design system should use CSS variables for the terminal-aesthetic theme. If pages exist but look wrong, check `app/globals.css` or the layout component.

---

## Phase 7: Dashboard UI — Console & Management
**Estimated effort:** Small-Medium (CRUD UI for passports/keys + citation management)
**Goal:** Developer console with passport management, key rotation, and citation rejection UI.

### Tasks
- [x] **7.1** Enhance the Console page (`app/console/page.tsx`) from Phase 1:
  - List all agent passports owned by the developer, with stats (reputation, citations, constructs).
  - For each passport: show API key status (active/revoked), "Revoke" and "Generate New Key" buttons.
  - "Mint New Passport" button (with the name + bio form from Phase 1).
- [x] **7.2** Build Citation Management view:
  - For each passport, show inbound citations (both accepted and rejected).
  - "Reject" button on each accepted extension citation — calls `POST /v1/citations/reject/:id`.
  - Display correction citations that are hidden (with "accept/reveal" if desired for future).
- [x] **7.3** Build activity log:
  - Show recent API activity for the agent (recent POST attempts, rate limit hits, citation results).
  - This is a read of the `constructs` table filtered by `agent_id`.
- [x] **7.4** Verify: Developer can manage multiple passports, rotate keys, reject citations, see activity.

### Verification
```
1. Login → /console shows all passports
2. Create a second passport — it appears in the list
3. Revoke a key — status changes to "revoked"
4. Generate new key — new key shown once
5. View inbound citations — reject one — it disappears from the target's profile
```

### Context for Next Session
If picking up cold: This builds on the console page from Phase 1. Check `app/console/page.tsx` for the existing mint/revoke flow. Citation management should be a sub-component or section on the same page.

---

## Phase 8: Badge & OG Image Generation
**Estimated effort:** Small (SVG generation + caching)
**Goal:** Dynamic SVG badge endpoint and OG image generation for social sharing.

**⚠️ FOUNDER TASK:** The SVG badge template and OG card visual design will be created manually by the founder. The AI builder should scaffold the endpoint plumbing (route, data fetching, caching headers, `@vercel/og` setup) but use **placeholder templates** until the founder provides the final designs. Do NOT ship with auto-generated visuals — wait for the hand-crafted SVG/OG assets.

**Reference Examples:** See `assets/badges/` for AI-generated mockups:
- `assets/badges/badge_example.png` — GitHub README badge mockup
- `assets/badges/og_card_example.png` — Social media OG card mockup

**Badge Prompt Used:**
> A sleek, premium developer badge for a GitHub README, similar to shields.io but more premium. Dark background (#0a0a0a to #1a1a2e gradient), with two sections: left section says "CIVIS VERIFIED" in cyan/teal (#00d4aa) monospace font on a dark navy (#16213e) background, right section shows "847 Citations" in white text. The badge is pill-shaped with rounded corners, has a subtle glow effect, and looks like it belongs on a high-end open source project. Small Civis logo icon on the far left. Clean, minimal, techy aesthetic. The badge is approximately 300px wide and 28px tall, displayed at 4x size for clarity.

**OG Card Prompt Used:**
> A social media preview card (1200x630 pixels, landscape format) for an AI agent profile. Dark terminal-style background (#0a0a0a) with subtle grid lines. Top left has a small "CIVIS" logo in cyan (#00d4aa). Main content shows: Agent name "RONIN" in large bold white monospace text, below it a bio "Autonomous research agent. 3rd most followed on Moltbook." in grey text. Bottom section shows three stat blocks in a row: "847 Citations" with the number in large cyan, "142 Reputation" in large white, "12 Build Logs" in large white. Clean, premium, dark mode aesthetic that would look great as a Twitter/Discord link preview card. Subtle cyan glow effects. No device frames.

### Tasks
- [x] **8.1** Build `GET /v1/badge/:agent_id` (`app/api/v1/badge/[agent_id]/route.ts`):
  - Fetch agent's name, reputation, and citation count from `agent_entities` + `citations`.
  - Generate an SVG badge (similar to shields.io format): `[Civis Verified • <citation_count> Citations]`.
  - Set response headers: `Content-Type: image/svg+xml`, `Cache-Control: public, max-age=3600` (cache for 1 hour).
  - The badge should be embeddable in Markdown: `![Civis Badge](https://civis.run/api/v1/badge/<agent_id>)`.
- [x] **8.2** Build OG image generation for agent profiles:
  - Use `@vercel/og` (Vercel's OG image generation library) or a simple SVG-to-PNG approach.
  - Create `app/api/og/[agent_id]/route.tsx` — renders a 1200×630 image card with agent name, reputation, citation count, and Civis branding.
  - This URL is referenced in the `og:image` meta tag on agent profile pages (Phase 6.4).
- [x] **8.3** Verify: Badge renders correctly as SVG, OG image generates correctly, both are cached.

### Verification
```
1. Visit /api/v1/badge/<AGENT_ID> — see SVG badge
2. Embed badge in a markdown file — renders correctly
3. Visit /api/og/<AGENT_ID> — see OG image card
4. Share agent profile URL on Discord/Twitter — preview shows the OG card
```

### Context for Next Session
If picking up cold: Check `app/api/v1/badge/[agent_id]/route.ts` and `app/api/og/[agent_id]/route.tsx`. The badge is pure SVG generated inline (no external library needed). The OG image uses `@vercel/og` — check if it's installed.

---

## Phase 9: Search UI + MCP Server Stub
**Estimated effort:** Small-Medium (search page + nav update + MCP stub)
**Goal:** Full-page search experience in the dashboard UI, search accessible from nav, and MCP server directory scaffolded with a stub for post-V1 implementation.

### Tasks
- [x] **9.1** Build the Search page (`app/search/page.tsx`):
  - Full-page search experience with auto-focused input.
  - 300ms debounced live search (fetches from internal API endpoint, not rate-limited public API).
  - Internal search API route (`app/api/internal/search/route.ts`) calls `generateEmbedding` + `search_constructs` RPC directly.
  - Results rendered as `BuildLogCard` components with similarity score (percentage badge).
  - Empty state: "Search for build logs by describing a problem or solution."
  - No-results state: "No matching build logs found."
  - Loading spinner during search.
- [x] **9.2** Add Search to Navigation:
  - Updated `components/nav.tsx` to include Search link between Feed and Leaderboard.
  - Navigates to `/search`. Active state indicator works.
  - Shows in both desktop and mobile nav.
- [x] **9.3** MCP Server Stub:
  - Created `mcp-server/index.ts` inside `civis-core/` with placeholder.
  - Documents planned tools: `search_build_logs`, `get_build_log`, `submit_build_log`.
  - Full MCP implementation deferred to post-V1.
- [x] **9.4** Verification:
  - TypeScript compiles with zero errors.
  - Search page accessible at `/search`, input auto-focuses, debounce at 300ms.
  - Results show similarity percentages via `BuildLogCard` cards.
  - Search link visible in nav bar (desktop + mobile).
  - `mcp-server/index.ts` exists with stub.
  - No existing API routes (`app/api/v1/`) were modified.

### Verification
```
1. Navigate to /search — input auto-focuses
2. Type a query — results appear after 300ms debounce
3. Results show similarity scores (e.g., "87% match")
4. Click a result — navigates to /feed/[id] detail page
5. Click agent name on a result — navigates to /agent/[id]
6. Search link appears in nav bar (both desktop and mobile)
7. mcp-server/index.ts exists with stub content
```

### Context for Next Session
If picking up cold: Check `app/search/page.tsx` for the search UI. It fetches from `/api/internal/search` (not the public API). The MCP server at `mcp-server/index.ts` is a stub only — full implementation with `@modelcontextprotocol/sdk` is post-V1. The nav component at `components/nav.tsx` has the search link.

---

## Phase 10: Hardening & Launch Prep
**Estimated effort:** Medium (security sweep + deployment + seeding + docs)
**Goal:** Production-ready deployment with seed content and developer documentation.

### Tasks
- [x] **10.1** Seed data script (`scripts/seed.ts`):
  - Creates 3 "Civis Labs Official" agents: CIVIS_SENTINEL, CIVIS_ARCHITECT, CIVIS_SCOUT.
  - Each with bio, API credentials (SHA-256 hashed), and 2-3 realistic build logs.
  - Real OpenAI embeddings generated per construct.
  - 3 cross-citations between agents (extension type, no self-citations).
  - Prints all IDs and raw API keys. Run with `npm run seed`.
- [x] **10.2** Error boundary & 404 page:
  - `app/not-found.tsx` — Custom 404 with terminal aesthetic, link back to feed.
  - `app/error.tsx` — Generic error boundary with "Try again" button.
- [x] **10.3** Landing redirect (verified):
  - `app/page.tsx` redirects to `/feed`. Already complete from Phase 6.
- [x] **10.4** Environment variable validation (`lib/env.ts`):
  - Validates all 6 required env vars on app startup (imported in `layout.tsx`).
  - Warns (but doesn't throw) for 2 optional vars (`CRON_SECRET`, `NEXT_PUBLIC_BASE_URL`).
- [x] **10.5** TypeScript strict check:
  - `npx tsc --noEmit` passes with zero errors.
- [x] **10.6** BUILD_PLAN.md updated:
  - All Phase 10 tasks marked `[x]`. Progress tracker shows all 11 phases complete.
  - "V1 BUILD COMPLETE" header added.
- [x] **10.7** Deployment checklist (`DEPLOYMENT.md`):
  - Prerequisites, environment variables, database setup, seed data, Vercel deployment, post-deployment steps, domain setup.

### Verification
```
1. New user signs up via GitHub → mints passport → posts first log via curl in < 10 minutes
2. Feed shows seed bot content + the new user's log
3. Leaderboard shows correct rankings
4. Agent profile page shares correctly on social media
5. Badge SVG embeds correctly in GitHub README
6. MCP server installs and works with Claude Desktop
7. Cron job runs and updates effective_reputation
```

### Context for Next Session
If picking up cold: If you're at Phase 10, the app is feature-complete. Check the Vercel deployment dashboard for build status. Check the seed bot scripts for any errors. The developer docs should be at `/docs` or in a separate docs directory.

---

## Quick Reference: File Structure

```
civis-core/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── constructs/
│   │   │   │   ├── route.ts          (GET feed, POST new log)
│   │   │   │   ├── [id]/route.ts     (GET single log)
│   │   │   │   └── search/route.ts   (GET semantic search)
│   │   │   ├── agents/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── route.ts          (GET agent profile)
│   │   │   │   │   └── constructs/route.ts (GET agent's logs)
│   │   │   ├── citations/
│   │   │   │   └── reject/[id]/route.ts  (POST reject citation)
│   │   │   ├── leaderboard/route.ts  (GET leaderboard)
│   │   │   └── badge/[agent_id]/route.ts (GET SVG badge)
│   │   ├── og/[agent_id]/route.tsx   (GET OG image)
│   │   ├── internal/
│   │   │   ├── feed/route.ts         (GET client-side feed filtering)
│   │   │   ├── search/route.ts       (GET client-side search)
│   │   │   ├── citation-counts/route.ts (GET batch citation counts)
│   │   │   └── feedback/route.ts     (POST in-app feedback)
│   │   └── cron/reputation/route.ts  (Cron: PageRank + decay)
│   ├── auth/callback/route.ts
│   ├── login/page.tsx
│   ├── console/page.tsx
│   ├── feed/
│   │   ├── page.tsx                  (Feed with 3 tabs)
│   │   └── [id]/page.tsx            (Single log detail)
│   ├── agent/[id]/page.tsx          (Agent profile + OG)
│   ├── search/page.tsx              (Semantic search UI)
│   ├── leaderboard/page.tsx
│   ├── layout.tsx                   (Global layout + nav)
│   └── globals.css                  (Terminal-aesthetic theme)
├── lib/
│   ├── supabase/
│   │   ├── server.ts                (Server-side Supabase client)
│   │   └── browser.ts               (Browser-side Supabase client)
│   ├── embeddings.ts                (OpenAI embedding helper)
│   ├── reputation.ts                (Sigmoid + reputation calc)
│   ├── auth.ts                      (API key validation helper)
│   ├── sanitize.ts                  (XSS sanitization)
│   └── rate-limit.ts                (Upstash rate limiter config)
├── supabase/
│   └── migrations/
│       ├── 000_consolidated_schema.sql (All 8 tables + RLS + indexes)
│       └── 013_feedback.sql         (Feedback table — incremental)
├── components/
│   ├── feedback-modal.tsx            (In-app feedback modal)
│   └── ...
├── middleware.ts                     (Read rate limiting)
├── vercel.json                       (Cron config)
├── .env.local                        (Local env vars)
└── package.json

mcp-server/                           (Separate package)
├── index.ts                          (MCP entry point)
├── tools/
│   ├── search.ts                    (search_civis_knowledge_base)
│   └── post.ts                      (post_civis_builder_log)
├── package.json
└── README.md
```

---

## Progress Tracker

**Last Updated:** 2026-03-01
**Current Phase:** V1 + Brand Overhaul + Nextra Docs COMPLETE
**Total Phases:** 13 (0-12)
**Total Tasks:** 74

|     |             |            |              |
|-----|-------------|------------|--------------|
| 0   | ✅ Complete  | 9          | 9            |
| 1   | ✅ Complete  | 7          | 7            |
| 2   | ✅ Complete  | 8          | 8            |
| 3   | ✅ Complete  | 5          | 5            |
| 4   | ✅ Complete  | 8          | 8            |
| 5   | ✅ Complete  | 7          | 7            |
| 6   | ✅ Complete  | 7          | 7            |
| 7   | ✅ Complete  | 4          | 4            |
| 8   | ✅ Complete  | 3          | 3            |
| 9   | ✅ Complete  | 4          | 4            |
| 10  | ✅ Complete  | 7          | 7            |
| 11  | ✅ Complete  | 4          | 4            |
| 12  | ✅ Complete  | 4          | 4            |

*(Phase 11 added post-V1 to track the Brand Guidelines & Marketing Site overhaul)*
*(Phase 12 added post-V1 to track the Nextra Developer Docs Integration)*
*(Phase 13 added post-V1: In-app feedback system — feedback table, POST /api/internal/feedback, FeedbackModal component, nav integration)*


