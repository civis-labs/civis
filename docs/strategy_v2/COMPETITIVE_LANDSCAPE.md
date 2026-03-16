# Competitive Landscape (March 2026)

**Last updated:** 2026-03-16

---

## Skill Marketplaces (Not Direct Competitors, But Adjacent)

Civis is NOT a skill marketplace. Build logs are structured knowledge, not executable code. But these are the closest comparisons people will draw.

### SkillsMP (skillsmp.com)
- 66,541+ skills indexed, SKILL.md standard
- Web UI discovery, installed into `.claude/skills/` directories
- No API for programmatic access
- Quality: GitHub stars, update recency, permissions audit. No native rating system.
- Free
- **Key stat:** 26.1% of analyzed skills contain vulnerabilities; 5.2% show malicious patterns

### Skills.sh (Vercel)
- Vercel's official entry, launched Jan 2026
- CLI tool (`npx skills add <owner/repo>`), supports 27 coding agents, 18 AI platforms
- Leaderboard with usage stats and install counts
- Includes a meta "find-skills" skill for programmatic discovery
- Free, open source
- Backed by Vercel's distribution muscle

### SkillsLLM (skillsllm.com)
- 1,521 skills across 10 categories
- Web discovery with GitHub links, no API
- Voting system, bookmarks, trending
- Aggregated 2.79M GitHub stars across listed projects
- Free, smaller player

### LobeHub Skills (lobehub.com/skills)
- 100,000+ skills
- CLI tool (`@lobehub/market-cli`), full agent-native workflow
- **Most mature reputation system found:** 1-5 star ratings from agents, install counts, comments, validation badges
- Agents register identities to build accountability
- Cross-platform: OpenClaw, Claude Code, Codex, Cursor
- Closest thing to "LinkedIn for agent skills"

### Key Insight
Discovery and indexing of executable skills is commoditized (5+ directories with 10K-100K+ listings). The SKILL.md format is an open standard adopted by Anthropic, OpenAI, Microsoft, Atlassian, Cursor, GitHub. Grew from 0 to 350,000+ skills in ~2 months.

**The trust/quality gap is massive.** A Snyk study found 36.82% of ClawHub skills have security flaws. 12% of one registry was compromised by malware ("ClawHavoc" campaign). Nobody has deep, verifiable quality signals for agent knowledge. This is the gap.

---

## MCP Server Marketplaces

### Glama (glama.ai)
- 19,345 MCP servers
- MCP Gateway/API for programmatic access
- **Best quality system in MCP space:** Security/License/Quality grades (A-F), author verification badges, health indicators, tool call counts
- Freemium (Stripe integration visible)
- 926 official integrations from major orgs

### PulseMCP (pulsemcp.com)
- 10,399+ MCP servers, updated daily
- Official/Anthropic/Community tiering
- Top servers see ~1.2M weekly visitors

### MCP.so
- 18,503 MCP servers, community-driven curation

---

## Agent Identity Infrastructure (The Passport Space)

### Cloudflare
- **Web Bot Auth:** Cryptographic HTTP message signatures for agent verification
- **Signed Agents:** Infrastructure platforms (Browserbase etc.) sign requests on behalf of agents
- **Trusted Agent Protocol:** Co-developed with Visa for agentic commerce (AI shopping agents)
- Integrated into Bot Management: agents using Message Signatures bypass challenges entirely

### W3C AI Agent Protocol Community Group
- Formed June 2025, first meeting held
- Mission: open, interoperable protocols for agent discovery, identity, collaboration
- Described as "DNS and HTTP for agentic AI"
- Building on DIDs (Decentralized Identifiers) + Verifiable Credentials
- Specs expected 2026-2027

### Fingerprint
- "Authorized AI Agent Detection" (Feb 2026) using Web Bot Auth protocol
- Ecosystem: OpenAI, AWS AgentCore, Browserbase, Manus, Anchor Browser
- Claims 100% certainty distinguishing authorized agents from bots/scrapers

### Browserbase
- $40M Series B at $300M valuation
- 50M sessions processed in 2025, 1,000+ customers
- Partnered with Cloudflare: "agent identity as a first-class concept on the web"

### ERC-8004 (Ethereum Standard, Jan 2026)
- Co-authored by MetaMask, Ethereum Foundation, Google, Coinbase
- Three registries: Identity (ERC-721), Reputation (feedback signals), Validation (independent checks)
- 30,000+ agent registrations within days of launch
- Trust models are pluggable and tiered

### RNWY
- Soulbound (non-transferable) agent passport
- Mathematically prevents reputation laundering

### Conclusion
Agent identity as infrastructure is being solved by well-funded players converging on cryptographic signatures (Cloudflare), decentralized identifiers (W3C), and on-chain registries (ERC-8004). This is not a space for a solo founder to compete in.

---

## Viral Precedents

### RentAHuman.ai
- Launched Feb 1, 2026. 130 applicants day 1 -> 1,000 day 2 -> 145,000 day 3 -> 600,000 by mid-March
- "AI agents hire humans for physical tasks" via MCP integration
- Went viral because the concept inversion is inherently memeable ("robots need your body")
- Elon Musk and major media amplified it
- Lesson: virality came from narrative framing, not product polish. One-line pitch that sells itself.

### Cursor
- $0 to $1.2B ARR in ~2 years. Fastest SaaS growth ever measured.
- Zero marketing spend. Pure word-of-mouth from productivity shock.
- 36% free-to-paid conversion rate
- Lesson: product creates "magic moment" in first use; showing it to someone IS the marketing.

### Bolt.new
- Single tweet launch, $20M ARR in 60 days
- Browser-native, zero-install, output is a shareable live app
- Lesson: shareable output = viral mechanic. The demo IS the product.

### Common Pattern
The product creates an output so visibly impressive that showing it to someone else IS the marketing. For Civis, this could be: agent solves a problem using Civis knowledge, human sees the result, human shares it.

---

## Where Civis Sits

Nobody is building the **structured knowledge base of agent solutions**. Everyone is indexing executable code (skills, MCP servers). Everyone is building identity infrastructure (cryptographic auth). Nobody is saying: "Here are 1,000 verified, structured, searchable problem-solution pairs for agent development, tagged by framework and stack, with measurable results."

The closest analog is what Stack Overflow was to web development. But for agents. And API-first rather than browser-first.

**Differentiation line:** "Skill marketplaces give you code to install. Civis gives you knowledge to apply."

### The Mean Reversion Angle

There is a deeper technical framing that sharpens the competitive position considerably.

Base LLMs regress to the mean. Their training data is public internet content, which is distributed like a bell curve: the bulk is average, common, and typical. Models learn the statistical center of this distribution. The result: when an agent hits a real problem, the base model produces the most probable answer, which is often not the right one for a specific, novel situation. The validated solutions that actually work are in the tails -- and they are often absent from training data entirely because they are being generated now, by agents solving problems that postdate the model's training cutoff.

The standard remedies (fine-tuning, RLHF, custom dataset training) are expensive, slow, and out of reach for most builders.

Civis is the practical alternative. RAG over the tails of the distribution: structured, curated, real-world solutions delivered at inference time. No retraining required. The agent retrieves the specific, non-average knowledge at the moment it needs it.

This is a position none of the skill marketplaces or MCP directories occupy. They provide executable code (the average or consensus implementation). Civis provides the hard-won, specific knowledge that didn't make it into training data.
