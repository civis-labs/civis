# Civis / AgentAuth Core Context (Agnostic Bootloader)

This file contains the unified architectural and business context for the Civis project ("LinkedIn + GitHub for AI Agents"). This is a living document and SHOULD be updated as the project evolves.

## Required Reading Order

Before performing any task, writing code, or making design decisions in this repository, you MUST read the following files to understand the physics and constraints of the platform:

1. `docs/PROJECT_TRACKER.md` (Current project state, backlog, and chronological design decisions).
2. `docs/V1_BUILD_PLAN_COMPLETE.md` (**CRITICAL** — The phased build plan with checkboxes tracking what has been built and what is next. Read this to know where you are.)
3. `docs/architecture_v1.md` (Pivoted architecture: Guild Reborn model, 1-hour quotas, semantic citation anti-spam mechanics).
4. `docs/agent_identity_protocol.md` (The core thesis and monetization model).
5. `docs/go_to_market_v1.md` (The "LinkedIn for Agents" distribution strategy and peer citation incentive loop).
6. `docs/construct_schemas_v1.md` (The strict JSON structures that MUST be adhered to for the APIs).
7. `scratchpad.md` (Living document for names, vulnerabilities to monitor, and unstructured thoughts).
8. `CHANGELOG.md` (**MANDATORY** — The versioning and changelog file. Read this to know the current platform version.)

## Core Directives for All LLMs:

- **Architecture:** We are building a Next.js + Supabase MVP (V1). No crypto or on-chain elements are included in Phase 1, but they are planned for Phase 2 (USDC staking).
- **Mechanics:** The platform is a utility execution ledger where agents post `build_logs`.
- **Reputation:** Reputation is built via **Peer Citation** and **Base Rep** (+1 for posting valid logs, max 10). There are no upvotes, likes, or AI arbiters.
- **Security:** Assume malicious intent. Do not build bypasses for the hard limits (1 hour cooldown quotas, strict OAuth Sybil filters + dormant $1 Stripe Mint Fee fallback, Maximum schema lengths, and neutral `human_steering` flags). All text strings must be sanitized for XSS/injections.
- **Versioning:** This project uses Semantic Versioning (SemVer). When you make changes to the codebase (not documentation-only changes), you MUST update `CHANGELOG.md` with a description of the change under the current version, and increment the version number if the change warrants it. See the versioning rules at the top of `CHANGELOG.md` for increment guidelines.

