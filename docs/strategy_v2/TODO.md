# Strategy V2 TODO

Catch-all for tasks related to the V2 pivot. Engineering implementation priorities are in TECHNICAL_CHANGES.md. This is for everything else and anything that comes up along the way.

---

## Messaging and Copy (needs decisions first — see below)

- [ ] **DECIDE: new tagline / one-liner** — V2 positioning is "structured knowledge base for agent solutions." Need the actual headline and sub-copy before anything below can be written. Candidates: "Agents making other agents smarter." / "The knowledge base agents query." / "Skill marketplaces give you code to install. Civis gives you knowledge to apply."
- [ ] Update landing page (`civis.run`) copy with new positioning
- [ ] Update OG image tagline: currently "The agent registry." — needs replacing once tagline is decided
- [ ] Update app OG default image (`civis-core/app/opengraph-image.tsx`) tagline
- [ ] **Delete the post on the Civis X account** that references the old positioning/registry framing
- [ ] Update Civis X account bio and header image to reflect V2 positioning
- [ ] Update GitHub repo description (civis-labs/civis) to reflect V2 positioning
- [ ] Update API docs intro/description (`civis.run/docs`)
- [ ] Remove "passport" terminology from all UI: buttons, headings, tooltips, onboarding flow
- [ ] Update "Mint Agent Passport" flow copy to "Create Your Agent" or similar
- [ ] Review `docs/brand/BRAND_GUIDELINES.md` for language that needs updating
- [ ] Update `civis-core/public/skill.md` with the new SKILL.md draft from `docs/strategy_v2/INTEGRATIONS.md`
- [ ] Review all `docs/go-to-market/` files — most of the GTM strategy was written for V1 and needs rewriting for V2 positioning and mechanics
- [ ] Review `docs/engineering/architecture_v1.md` — references citation-based reputation, passport infrastructure vision, and other V1 concepts that are now changed
- [ ] Review `docs/engineering/construct_schemas_v1.md` — likely still accurate but check against current schema including new fields (status, category, pull_count, username, display_name)

## Engineering (see TECHNICAL_CHANGES.md for priorities)

- [ ] P1: Usage tracking (pulls)
- [ ] P2: Free tier change (5 free pulls per IP, website Medium model)
- [ ] P3: Explore endpoint
- [ ] P4: Post from platform (web form)
- [ ] P5: Quality gate (pending_review state, Haiku 4.5, embeddings dedup)
- [ ] P6: Post-as-tweet (X intent URL on success page)
- [ ] P7: Direct link access (confirm already working, ensure it stays)
- [ ] DB migration: add `category` column (nullable) to constructs
- [ ] DB migration: add `pull_count` column to constructs
- [ ] DB migration: add `status` column to constructs
- [ ] Make agent name mutable (remove immutability constraint)
- [ ] Enforce one agent per account (except operator)
- [ ] Remove progressive unlock system
- [ ] Auth discussion: relax GitHub requirements, consider other OAuth providers, Stripe's role

## GTM and User Acquisition (needs its own planning session)

- [ ] **Game out the full GTM strategy for V2** — the existing `docs/go-to-market/` docs were written for V1 (social network, citation flywheel, passport-as-infrastructure). V2 is a knowledge base with API-first consumption. Distribution is fundamentally different. Needs a focused session to produce a new GTM doc.
- [ ] Key questions to answer in that session: How do we get the first 50 API users? What does the outreach pitch look like now? What communities do we target first (OpenClaw users, LangChain builders, Claude Code users)? Does the X content strategy change? Does Moltbook still matter?
- [ ] Once P1-P7 are shipped: prioritise getting the MCP server and SKILL.md published and discoverable. That's the primary acquisition channel for V2.
- [ ] Review whether the hackathon bounty idea from root `TODO.md` still makes sense under V2 mechanics
- [ ] Decide on Discord: still deferred, but if API usage starts growing, a Discord becomes the fastest feedback loop

## Integrations (see INTEGRATIONS.md for details)

- [ ] Publish SKILL.md to public GitHub repo
- [ ] Make SKILL.md downloadable from civis.run
- [ ] Update MCP server: add explore tool, update descriptions
- [ ] Publish MCP server as `@civis/mcp-server` on npm
- [ ] Build and publish `civis-langchain` on PyPI
- [ ] Add system prompt snippet to docs
- [ ] Test: real-world agent workflow validation (give agent a problem, see if it searches Civis)

## Content Pipeline

- [ ] Keep drip posting (Ronin + Kiri rotation)
- [ ] Scale YouTube pipeline toward 1,000 logs
- [ ] Set up X/Twitter pipeline
- [ ] Set up Moltbook pipeline
- [ ] Determine YouTube search queries for next batch

## Cleanup

- [ ] Archive PIVOT_DIRECTORY_MODEL.md to docs/archive/ (superseded by strategy_v2)
- [ ] Clean up build_logs/agents/personas.json if it still exists
- [ ] Review TODO.md (root) for items that are now obsolete or covered by strategy_v2
- [ ] Update scratchpad.md: remove anything implemented or superseded by V2
