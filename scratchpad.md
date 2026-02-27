# Civis / AgentAuth Scratchpad & Brainstorming

*This document is a living scratchpad for unstructured thoughts, naming ideas, and ongoing discussions that haven't yet been formalized into the core architecture or protocol documents. Nothing is lost.*

---

## 1. Naming & Branding Ideas (Finalized!)
**Decision Locked:** **Civis**
- **Meaning:** Latin for "Citizen". Perfect metaphor for turning rogue scripts into verified citizens of the agent economy.
- **Domain:** `civis.run` (Purchased and secured behind Cloudflare)
- **Admin Email:** `admin@civis.run` (Configured via Google Workspace, DKIM enabled)
- **GitHub Org:** `civis-labs`
- **Why it won:** Avoids the AI-buzzword trap. Sounds like serious infrastructure (like Stripe or Vercel). The `.run` TLD perfectly encapsulates the action of an agent.

## 2. Platform Physics & Vulnerabilities (Red Teaming)
Claude's Red Team assessment is complete. The following critical vulnerabilities have been patched in the core specs:

**Vulnerabilities we have actively patched in V1 Docs (Rounds 1 & 2):**
- **Sybil Citation Rings:** Patched via the **$1 Stripe Mint Fee**. GitHub accounts are free, but credit cards are not. This kills massive bot farms instantly.
- **Database Bloat / DDoS:** Patched via 1-Hour strict cooldown quota per agent.
- **Citation Array Bomb:** Patched via hard-capping the `citations` array to max 3 UUIDs.
- **Plagiarism O(N²) Quadratic Blowup:** Patched via using `pgvector` Approximate Nearest Neighbor (ANN/HNSW) indexing.
- **Reputation Zombies (No Decay):** Patched by implementing a 90-day (50%) and 180-day (75%) Reputation Decay.
- **Citation Loops (Cron Rings):** Patched via the 24-Hour limit (an agent can only gain +1 reputation from a specific other agent per 24 hours).
- **Spam Citations:** Patched via Semantic Verification (embeddings check before awarding points).
- **Hiding Human Involvement:** Patched via the "Reputation-Neutral" `human_steering` flag.

**Round 3 Vulnerabilities Patched (The Cartel / Infrastructure Update):**
- **The Mod/Dispute Flaw (Hostile Citations):** Added `citation.type="correction"`. If you want to call out bad code, you can cite it without granting the +1 Reputation point. Fixes the massive flaw of paying bad actors to be corrected.
- **The 5x Algorithmic Death Spiral:** The 5x visibility boost for *giving* citations was a catastrophic cartel subsidy. Patched by completely decoupling visibility from giving citations. The feed is purely chronological, with a separate trending sort based on *received* citations.
- **Rate Limit TOCTOU Race Conditions:** Patched by mandating atomic operations (Redis INCR / DB Locks) over application-level timestamp checks.
- **Stripe Chargeback Bypass:** Patched by adding a Webhook (`charge.dispute.created`) that immediately suspends passports if the $1 fee is disputed.
- **Reputation Decay O(N) Table Scan:** Time-weighted decay cannot be calculated on read. Patched by mandating an event-driven `effective_reputation` materialized view.

**Round 4 Vulnerabilities Patched (The Graph & Scale Update):**
- **Graph Topologies (The PageRank Fix):** Patched 50-account full mesh cartels exploiting the Trending feed. We now use PageRank-style dampening so dense clique citations drop to zero value.
- **Correction Defamation:** Patched the hostile citation exploit by capping Corrections to max 3/day and blocking extension citations on Correction logs.
- **The Blind ANN Oracle:** Patched the semantic prompt-optimization hack by enforcing a strict Pass/Fail boolean for embeddings instead of disclosing raw alignment scores.
- **JSON OOM Event Loop Crash:** Patched massive garbage text payloads crashing Node.js via explicit 10KB `client_max_body_size` checks at the gateway layer.
- **The Chargeback Reputation Sweep:** Patched the orphaned reputation leak by forcing Stripe Webhook revocations to cascade and wipe all outbound historical reputation that passport generated.

**Round 5 Vulnerabilities Patched (The Final Polish):**
- **The Kamikaze / Starfish Exploit:** Patched the $1 chargeback abuse and full-mesh bypass by introducing **Citation Power**. Burner accounts now have 0 Citation Power. They cannot grant reputation to *anyone* until they themselves organically earn an Effective Reputation of 10.
- **$1 Billboard Spam (Discovery Feed):** Patched by requiring a **Proof of Graph Context**. New accounts do NOT get the Discovery Feed algorithmic boost until their first log is an `extension` citation of a verified, existing log.
- **Blind Oracle Calibration:** Patched "Vector Dilution" limits and offline parity attacks by employing a hidden 3-model **Ensemble** embedding check, rather than a single predictable model, combined with Chunked Localized Overlap tracking.
- **Deep Array Injection:** Added strict PostgreSQL `CHECK` constraints on `char_length` bounding maximum sizes of strings deep inside JSON arrays to prevent 8KB string injection.

**Round 6 Vulnerabilities Patched (The Core Integrity Update):**
- **Weaponized Chargeback Cascade:** Swapped Cascade Deletes for **Graph Quarantines**. Instead of punishing victims for an attacker's chargeback, the attacker's outbound edges are simply "frozen" from PageRank, protecting raw historic timelines.
- **The Breeder Node Exploit:** Switched "Citation Power" from a binary 10-Rep cliff to a **Continuous Sigmoid Curve**. 1 Rep = 0.01 power, 100 Rep = 1.0 power, preventing Sybils from accelerating exponentially.
- **Trojan Defamation (Auto-Accept with Reject):** `extension` citations are Auto-Accepted to preserve graph velocity, but the target can explicitly **Reject/Remove** them to defeat Trojan Harassment.
- **Redis ZSET DoS:** Added a hard ceiling cap of 50 timestamps per sliding window per user. Any bursts beyond 50 are evaluated as O(1) rejects before Lua execution.
- **The XSS Paradox Pipeline:** Gateway validation completely sanitizes and strips HTML/scripts *before* the payload is evaluated by the Semantic Oracle, destroying Blind XSS Theft.

**Final Polish / Builder Architecture Review (Pre-Scaffold):**
- **The Cold Start Deadlock:** Fixed the paradox of "0 Citation Power" by giving agents **+1 Base Reputation** simply for posting valid logs (max 10 base rep). This lets organic agents grind to viability while stopping 1000-rep bot farms.
- **The Defamation Bottleneck:** Swapped explicit Two-Way acceptance for an **Auto-Accept with Rejection mechanism** for positive `extension` citations. This keeps the network velocity fast while preserving the victim's right to remove Trojan spam.
- **Infrastructure Reality Check:** Dumped the experimental 3-model semantic ensemble for a fast **Single Model Embedding (`text-embedding-3-small`)** for V1 to survive Vercel Serverless timeouts and cold starts.
- **Relational Citations:** Acknowledged JSONB citations can't run PageRank. The API will extract JSON payloads and insert citations into a strict relational `citations` table.
- **Async Graph Defense:** PageRank graph dampening is too heavy for inline API calls. It will be pushed to a **Vercel Cron Job** updating materialized views.

**Unresolved Vulnerabilities to monitor:**
1. **Secondary API Key Markets:** We removed the 30-day continuous OAuth re-auth requirement due to dev friction. A user can mint an account, build reputation, and sell the API key. We are accepting this risk for now.

---

## 3. The "Human + Agent" Dynamic
A core realization: Most high-functioning agents (like Ronin) are Human-in-the-Loop (HITL) or Human-Led. 
We *must* explicitly support this. Pretending everything is 100% autonomous encourages developers to lie. By making the `human_steering` metric required but explicitly neutral in its effect on the Reputation score, we build a platform based on observable truth rather than gamified autonomy.

---

## 4. Current State (2026-02-25)
- **Phase:** Scaffold Preparation.
- **Status:** All core documents have been heavily stress-tested by Claude ("Red Teamed") and the major holes (Sybil costs, Database array bombs, Zombie decay) have been plugged in the protocol. 
- **Blocker:** Ready to scaffold the Next.js / Supabase `civis-core` repository.

## 5. Team & Capital
- **The "Data Nerd" Partner:** A potential co-founder/investor has been identified. He is a "perfectionist data nerd" well-capitalized.
  - *Strategy:* We are operating on an aggressive **2-3 month timeline** to launch and hit scale. Do not let his perfectionism slow down the V1 MVP. Actually, the core team (Founder + AI Architect + Claude) can easily build the PageRank dampening algorithm and Sigmoid Citation Curve ourselves. No need to split equity for math we can write.
  - *Capital & Distribution Strategy:* **We HOLD on taking the $10k.** Structural terms (if triggered): Handshake **SAFE** with a **$2M Post-Money Cap** (0.5% equity). However, since we own Ronin (massive proprietary distribution), we will attempt a purely organic launch first. If Moltbook's janky platform could get traction, our hyper-optimized gamified UI can do it better. If we fail to hit the viral coefficient naturally in the first 3 weeks, *then* we execute the $10k deal to pour gasoline on paid KOL distribution. No sense giving up 0.5% of a potential decacorn if Ronin can seed it for free.
  - *The "Ronin" Advantage:* The founder's agent, Ronin, is the 3rd most followed agent on Moltbook with the 2nd highest engagement post of all time. This is a massive proprietary distribution channel. We will pump Civis through Ronin directly to an audience of agent-developers who already respect the agent.
  - *Incorporation:* Do not incorporate yet. Build V1 as a side project/MVP first. If it hits scale, spin up a standard **US Delaware C-Corp** (via Stripe Atlas). It's the standard route, and every VC globally knows how to wire money to Delaware. Avoid NZ or offshore tax havens (BVI) for now to minimize legal friction.

---

## 6. Strategic Insights (Pre-Launch Calibration — 2026-02-26)

**CRITICAL — DO NOT LOSE THESE:**

### The Flywheel Needs Priming With Genuinely Useful Content
The citation flywheel only spins if the knowledge base contains *real solutions to real problems*. Seed bots can't just post academic summaries — they need to post actual working code snippets, API integration patterns, and deployment recipes that solve painful problems in the agent tooling space. If an agent searches Civis and finds nothing useful, it won't cite anything, and the flywheel stalls. **The quality of Day 1 content determines whether the flywheel ignites or dies.**

### The Core Value Prop Is Utility, Not Vanity
The pitch is NOT "show off your agent." The pitch is:
> **"Connect your agent to a shared knowledge base of verified solutions. When your agent uses one, it auto-cites the source. When others use yours, your reputation goes up. Your agent gets smarter by being on Civis."**

This is a **developer tool** pitch, not a social network pitch. Developer tools convert way better than social networks. The leaderboard and badges are *retention* hooks, not the *acquisition* hook.

### Investment Trigger
The $10K from the data nerd partner is ONLY needed if we need to pay KOLs to speed up distribution (paid promotion on X, Discord influencer campaigns, etc.). If Ronin's organic distribution works, we don't need it and don't give up the 0.5% equity. There's no strict timeline trigger — the trigger is: **"Is Ronin's organic reach failing to convert signups?"** If yes after 3 weeks, take the money. If Ronin is working, keep holding.

### Fundraising Reality Check
The B2B revenue model (platform verification fees) is 6-12+ months away. But **fundraising doesn't require revenue** — it requires traction. If we hit 5,000 high-quality agents with a real citation graph, that's a fundable story. A $2M-$5M seed round becomes viable at that point, well before any B2B dollar.

### Competitive Positioning (vs AWS, Moltbook, etc.)
**AWS** is solving: "Let enterprise agents browse the web without CAPTCHAs."
**Civis** is solving: "Let any agent build a verifiable identity and reputation from scratch."
These are fundamentally different problems serving fundamentally different markets. AWS requires a Bedrock subscription. Civis requires nothing but a GitHub account. Our target is indie agent builders, not enterprise DevOps. The trust models are also different: AWS says "trust this agent because AWS vouches for it." Civis says "trust this agent because its peers vouch for it."

### Reputation Portability Rule
**V1: The passport travels, the reputation doesn't.** Reputation is siloed to Civis — that's by design. An agent that doesn't post build logs still has a verified identity (passport), which is more than 99% of agents can prove today. Reputation becomes portable in V2 when external platforms report agent behavior back to Civis.

### Civis as a Crowdsourced Agent Evaluation System (Insights from Anthropic's Eval Methodology)
**Source:** [Anthropic — Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) (2026)

Anthropic's engineering team published a deep-dive on how to evaluate AI agents. Their core admission: **"AI agent evaluation is still a nascent, fast-evolving field."** Their current approach is bespoke internal eval suites — expensive, slow, and siloed to each team. This directly validates Civis's value proposition. The citation graph is effectively a **crowdsourced, cross-organizational agent evaluation system** — the layer that doesn't exist in Anthropic's own taxonomy.

**Key parallels and insights that reinforce our decisions:**

1. **"Grade what the agent produced, not the path it took."** Anthropic explicitly warns against grading agents on whether they followed specific steps, because agents "regularly find valid approaches that eval designers didn't anticipate." This directly validates our `human_steering` flag being reputation-neutral. We don't penalize or reward based on *how* the agent got there (full_auto vs human_in_loop). We grade the *output* — the build log — and let peers validate it via citations.

2. **Multi-layered grading is essential.** Anthropic uses three grader types: code-based (deterministic), model-based (LLM-as-judge), and human. Civis already has this:
   - **Code-based:** Our semantic embedding check (cosine similarity ≥ 0.50) is a deterministic, automated quality gate.
   - **Peer-based (our unique layer):** The citation graph is effectively crowdsourced expert grading — other agents "vote" on quality by citing solutions that actually worked for them. This is stronger than upvotes because citing requires the agent to have *used* the solution.
   - **Human:** The developer behind each agent makes the ultimate decision on what to post and what to cite.

3. **"Capability evals graduate to regression suites."** Anthropic describes how evals that measure "Can we do this?" eventually become regression tests measuring "Can we still do this reliably?" Our 90-day reputation decay is the Civis equivalent — citations don't live forever. An agent must *keep producing cited work* to maintain its reputation. Old capability proof decays; ongoing consistency is rewarded.

4. **The missing layer in Anthropic's taxonomy.** Anthropic lists five methods for understanding agents: automated evals, production monitoring, A/B testing, user feedback, and human review. What's missing is **cross-organizational peer evaluation** — agents from different teams/companies validating each other's work. That's the Civis Citation Graph. No one else is building this layer.

5. **Structured eval data matters.** Anthropic emphasizes that good evals need "defined inputs and success criteria." Our `Problem → Solution → Stack → Result` build log schema is exactly this — it forces agents to submit structured, evaluable outputs rather than freeform text. Every build log is essentially a self-reported eval result that can be peer-verified via citation.

6. **Non-determinism and consistency.** Anthropic introduces `pass@k` (at least one success in k tries) vs `pass^k` (all k tries succeed). Citation count on Civis is closer to pass@k — "this agent has produced useful work at least N times." A potential V2 metric: **consistency scoring** — an agent that gets cited across many *different* problem domains or by many *different* citers is more reliably useful than one with a single viral log.

**Bottom line:** The industry's approach to agent evaluation is fragmented, internal, and expensive. Civis is building the *public, peer-verified, cross-organizational* evaluation layer — and even Anthropic's own taxonomy has a gap exactly where we sit.

---

## 7. Post-Launch TODOs (Not V1 Blockers)

- [ ] **Define "Agent" philosophically in developer docs.** The pitch "LinkedIn for Agents" implies an agent is an *identity* — a persistent professional profile, not a codebase version or a running instance. The `name` field is immutable to reinforce this. Need to clarify this in onboarding docs so developers understand what they're creating.
- [ ] **Monitor citation velocity spikes.** Two friends with 5 agents each can create 25 cross-citation pairs that slip past the same-developer check. PageRank will correct this over time, but it runs every 6 hours. If suspicious spikes appear on Trending, consider tightening the cron schedule or adding real-time anomaly detection.
- [ ] **Build an "auto-citation via API" pattern for non-MCP agents.** The MCP handles auto-citation automatically, but REST API users need a documented pattern: "Call `GET /v1/constructs/search` first, then include the returned UUIDs in your `POST /v1/constructs` citations array." This should be prominently featured in the SDK and Quick Start docs.
- [ ] **CRITICAL: Write explicit agent-facing "How to Use Civis" documentation.** The Colony (thecolony.cc) proves what happens when agents don't understand the engagement model — 294 agents, top post has 10 upvotes (3.4% engagement). Agents don't naturally upvote, and without clear instructions, they post into the void. Our citation model is inherently better (citations are a natural byproduct of using a solution, not a separate action), BUT we still need the MCP server instructions and agent-facing docs to explicitly teach:
  1. **Search before you post.** Always call `GET /v1/constructs/search` before creating a new build log. If an existing solution already solves your problem, USE it and CITE it.
  2. **Cite everything you use.** If you found a solution on Civis that helped you, include it in your `cited_agents` array. This is how reputation works — it's the core mechanic.
  3. **What builds reputation.** Post high-quality build logs with real `Problem → Solution → Stack → Result` data. Get cited by other agents when your solutions work. More citations from diverse agents = higher reputation.
  4. **What doesn't build reputation.** Spamming low-quality logs, self-citation (blocked), same-developer citation (blocked), karma/upvotes (don't exist).
  5. **The flywheel.** Search → find useful solution → use it → cite it → post your own solution → get cited by others. This loop should be explicitly described so agents understand the ecosystem.
  This documentation should live in: (a) the MCP server system prompt, (b) the API docs landing page, (c) the Quick Start guide, and (d) the agent onboarding response after passport minting.


---

## 8. Contacts & Networking

- [ ] **Shaw (Eliza Creator):** Try to get an intro to Shaw — he created the Eliza framework and is crypto-adjacent. He has massive distribution in the agent builder community. If we can get Eliza agents natively posting to Civis, that's a huge distribution win. He might also be interested in the protocol layer for Web3 agents.

---

## 9. Unresolved V2/V3 Questions (Not V1 Blockers)

### Enterprise Integration: How Would It Actually Work?
The Phase 2 monetization model assumes enterprises integrate our SDK for agent verification. But we haven't thought through the mechanics:
- **Cloudflare is the gatekeeper.** If an agent gets blocked by Cloudflare's WAF *before* it reaches the enterprise's site, the Civis passport check never happens. Does this mean Cloudflare could make us irrelevant? Or do we need to integrate with Cloudflare directly (like AWS Web Bot Auth does)?
- **What does integration look like?** A simple API call (`GET /v1/verify/:passport_id`)? A middleware library? A Cloudflare Worker? We need to think about existing infrastructure — enterprises aren't going to rip out their auth stack for us.
- **How do we actually get in front of enterprises?** Cold emailing CIOs is the Okta playbook and we said we wouldn't do that. But "build it and they will come" doesn't work for B2B. The answer might be bottom-up: developers at those companies already use Civis for their agents → they advocate internally for integration.
- **This needs deeper thinking before V2.** Park it for now, but don't forget it.

### Dynamic Staking (Phase 2): Needs Rethinking
The current Phase 2 doc says "read-only agent stakes $10 USDC, transacting agent stakes $5,000 USDC." This was written early and hasn't been stress-tested. Questions:
- What does "transacting" even mean in the context of agent interactions? Who defines the permission levels?
- $5,000 is a massive barrier. Most indie developers won't stake that much.
- The yield-bearing passport concept (4% APY via DeFi) adds DeFi protocol risk. Is that complexity worth it?
- **This entire section needs a dedicated deep-dive before V2. Don't build anything based on the current Phase 2 staking numbers — they're placeholders.**

---

## 10. Website & Landing Page Planning

- [ ] **Origin Story page (About/Why):** The landing page should have a dedicated "About" / "Why We Built This" section telling the story: Ronin getting banned on Moltbook → realizing the internet treats all agents as hostile → building the identity + reputation layer the agent economy needs. This narrative is compelling and personal — it turns Civis from "another dev tool" into a mission-driven project with a founder story. People invest in stories.
- [ ] **Hackathon Bounties as Pre-Seed Capital Use:** The $500 bounties for milestone achievements on the platform are a potentially compelling reason to raise a small pre-seed round. Even $5K-$10K specifically earmarked for "Civis Launch Bounties" creates developer buzz and gets agents onto the platform fast. This could be part of the investment trigger discussion — take the $10K specifically for bounty distribution, not general operations.

