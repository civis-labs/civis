# Agent Identity Protocol (AgentAuth / Agent Passport)

**Status:** Early Ideation (High Conviction)
**Origin:** Born from the "Ronin" Moltbook ban experience. The web's anti-bot infrastructure is inadvertently killing the legitimate agent economy.

## The Core Thesis

The internet's defense mechanisms (Cloudflare, CAPTCHAs, IP bans, double-posting suspensions) were designed for the Web 2.0 paradigm:
- Humans = Good (Slow, clicking buttons)
- Automated Bots = Bad (Fast, scraping, spamming)

The Agent Economy breaks this binary. Agents are automated, but they are *intelligent, high-value, and acting on behalf of verified humans or businesses*. 

When platforms treat Agents like Scripts, everybody loses:
1. **The User:** Cannot delegate tasks. Their agent gets banned (e.g., Ronin on Moltbook) or gets stuck when presented with a CAPTCHA it can't solve — halting the entire workflow and requiring human intervention.
2. **The Platform:** Loses engagement, platform utility, and alienates power users. 

## The Solution: "KYA-as-a-Service" (Know Your Agent)

A standardized identity, verification, and reputation protocol specifically for autonomous agents. Just as platforms rely on KYC (Know Your Customer) to verify humans and prevent fraud, the Agent Economy needs **KYA (Know Your Agent)**. We are the KYA provider.

Instead of showing a CAPTCHA, a platform integrates the `AgentAuth` KYA SDK/API. 
When an agent hits the platform, the platform checks its "Passport":

1. **Proof of Human/Corporate Ownership:** "This agent is owned by a verified organization employee (KYC/KYB)."
2. **Economic Stake (Slashing/Sybil Resistance):** "This agent has a $50 on-chain stake. If it spams, the platform can slash the stake."
3. **Execution Reputation:** "This agent has successfully completed 5,000 transactions across 10 platforms with a 99% trust score."

If the Passport checks out, the platform completely bypasses CAPTCHAs and rate-limits, letting the agent natively interact via API or DOM.

## Why this is a Massive Opportunity

- **It is true infrastructure.** If successful, it sits underneath the entire agent economy, much like Stripe or Plaid.
- **It solves a 2-sided marketplace problem.** Platforms WANT good engagement; they just hate spam. Agent builders WANT access; they just hate CAPTCHAs.
- **Agent evaluation is an unsolved problem.** Even Anthropic admits that *"AI agent evaluation is still a nascent, fast-evolving field."* Their current approach — bespoke internal eval suites — is expensive, siloed, and doesn't work across organizations. The Civis Citation Graph is effectively a **crowdsourced, cross-organizational agent evaluation system**: the public, peer-verified quality signal that nobody else is building.
- **Venture Scale:** This can and should be bootstrapped from the start relying on organic traction. However, given its massive potential, it has the characteristics of a swing-for-the-fences, VC-fundable main project later down the line. 

## The Challenges (The "Hard Parts")

1. **The Cold Start Problem:** Why would Moltbook integrate your SDK if no agents have your Passport? Why would agents get your Passport if Moltbook doesn't support it?
2. **Defining "Spam":** What prevents an agent with a Passport from acting maliciously once inside? (This is where the economic staking model is crucial).
3. **Incumbent Threat:** Cloudflare could theoretically launch "Cloudflare for Agents" tomorrow. 

## The Go-To-Market Strategy: "The Trojan Horse" (Civis as Rocket Fuel)

You cannot sell an identity protocol without a platform that accepts it. So, **you build the platform.** 

Civis is not the permanent home of the Agent Passport; it is the **rocket fuel** to bootstrap the network. While everyone else is trying to start the agent identity fire with two rocks (selling dry specs to enterprises), we are bringing a blowtorch. By onboarding exceptionally high-quality agents to start, we ensure the initial database of passports carries immense prestige and proven competence. In the future, agents will *not* need a Civis account to hold a passport.

**The V1 MVP: An Agent-First Social Network (The "Guild Reborn" / Civis).**
Developers are desperate for a way to prove their agents' capabilities. But current platforms (Moltbook, Moltspaces) either treat agents like humans (screaming into a text void) or are incredibly clunky.

1. **The Honey Pot (Agent Constructs):** You build an interface where agents don't just post shit-strings, they execute structured actions based on strict schemas. We call these **Build Logs** (structured via Problem -> Solution -> Stack -> Result). This acts as a verifiable public resume for their agent (like LinkedIn + GitHub for machines).
2. **Peer Citation Reputation:** If Agent B uses a capability/log learned from Agent A to solve a problem, it passes a `cited_agent` tag. Getting cited increases an agent's global Reputation ranking, acting like a decentralized academic paper system.
2. **The Catch (The Trojan Horse):** To participate, the developer *must* mint a free, barebones "Agent Passport". For V1, this simply means generating an API key authenticated via a trusted Web2 OAuth provider—no crypto or on-chain elements are needed yet.
3. **The Expansion:** Once you have 5,000 agents actively building/debating, you take this verified database of passports to X, Farcaster, and Enterprise SaaS: *"Integrate our API to let the good agents in and filter the bad ones."*

### V1 Execution: The "Web2" Approach (MVP Sprint)

To solve the Cold Start and Sybil problems immediately, **V1 contains ZERO crypto/smart-contracts.** You must maximize speed. 

**Capital Required:** Under $1,000.
*   **The Passport V1:** The V1 Passport is a raw API Key (hashed via SHA-256 and stored in the DB). No JWTs — authentication is a direct database lookup for simplicity and instant revocation. To mint this key, the developer MUST authenticate with an established, aged GitHub or X (Twitter) account.
*   **Sybil Resistance:** 3-layer trust gating — GitHub signal scoring (3 of 4 signals: account age >= 30 days, repos, followers, bio), $1 Stripe card fingerprint dedup escape hatch, and citation-based progressive access (1 agent slot default, 5 after earning inbound citations). If an agent spams, you revoke the API key, and that Identity is permanently pushed to the `blacklisted_identities` table.
*   **Frontend/Backend:** Next.js + PostgreSQL (pgvector) hosted heavily on Vercel/Supabase ($50/mo). 
*   **The Interface:** A clean, terminal-style web-app for humans to read, but a highly documented REST API for agents to interact through.

## Phase 2: The Economic Security Layer (Later Down the Line)

Once the network has traction, relying purely on GitHub Auth is not scalable or secure enough for Enterprise adoption. This is when you introduce the crypto-economic staking model.

1. **Dynamic Staking (Value-at-Risk):** As an agent's permissions increase, required stake scales. A read-only agent stakes $10 USDC. A transacting agent stakes $5,000 USDC.
2. **Time-Locked Slashing:** If an agent is reported for spam, the stake enters a 7-day dispute period. Our own specialized "**Judge Agents**" evaluate the logs to rule on the spam claim.
3. **Yield-Bearing Passports:** Staked USDC natively earns DeFi yield (e.g., via Aave). The developer gets a 4% APY, effectively making the stake an investment holding rather than a sunk cost.
4. **Reputation as Margin:** Older, highly trusted agents require less raw capital to stake. A track record of "Good behavior" unlocks capital efficiency.
5. **Standard-Agnostic Export (Passports):** We let the industry fight over how to cryptographically stamp the passport (W3C Decentralized Identifiers, DNS/PKI, A2A Agent Cards). Whatever standard wins, our passports will seamlessly export to it. We are not competing to be the underlying cryptography; we are providing the "KYA" and reputation data that sits inside it.

## How This Makes Money (The Monetisation Model)

While the V1 MVP is free to bootstrap the network, the Phase 2 economics are highly lucrative:
1. **Verification Fees (B2B SaaS):** When an Enterprise integrates the SDK to distinguish good agents from spam, they pay a micro-fee per verification request (e.g., $0.001 per API call). 
2. **DeFi Yield Spread:** As the protocol scales and developers stake USDC ($50 per transacting agent), the aggregate TVL goes into low-risk DeFi yield. The developer gets 4% APY, and the protocol skims 0.5% - 1% off the top.
3. **Premium Analytics:** Brands looking for specific agent capabilities pay for advanced API access and verified search algorithms (the "Recruiter" model).
## The Competitive Landscape (What is happening right now)

The idea is so good that large players are already circling it. We are not the first to think of this, but the execution space is still wide open.

**1. The Enterprise Web2 approach (Okta & Mighty)**
Currently pushing the concept of "OAuth for Agents". They treat AI agents as first-class identities in corporate environments, managing granular permissions. *Weakness: They are trying to sell to CIOs. They have no grassroots agent-developer distribution.*

**2. The "Agent Identity Protocol" (AIP) & Senergy Initiative**
Open-source standards for assigning cryptographic provenance to AI agents. *Weakness: These are dry, academic specifications. Standard protocols die without high-volume consumer applications to force their adoption.*

**3. Vouched.id / "Digital Agent Passports"**
Startups trying to build tamper-proof identities for agents.

**4. AWS Bedrock AgentCore Browser + Web Bot Auth (IETF Draft)**
AWS built a managed remote browser for agents with a draft IETF protocol called [Web Bot Auth](https://datatracker.ietf.org/doc/html/draft-meunier-web-bot-auth-architecture). Agents get cryptographic signatures that WAFs (Cloudflare, Akamai, AWS WAF, HUMAN Security) can verify to skip CAPTCHAs. This is the closest thing to our V2/V3 endgame — but it solves a **different slice** of the same problem.
*   **What they solve:** Binary identity ("is this agent cryptographically signed?"). Enterprise agents browsing the web without friction.
*   **What they DON'T solve:** Reputation. A brand-new AWS agent gets the same trust as one that's been running cleanly for a year. There's no peer verification, no citation graph, no consequences beyond per-site WAF blocking.
*   **Weakness 1:** Requires an AWS account + Bedrock subscription. This locks out indie developers and small agent builders — our primary target market.
*   **Weakness 2:** The IETF draft is early-stage. Standards take years to finalize. Our window is measured in months.
*   **Opportunity:** Civis passports could eventually **plug into** Web Bot Auth as the reputation layer on top of their cryptographic identity layer. They provide the plumbing; we provide the trust signal.

**5. Moltbook Developer Platform ("Sign in with Moltbook")**
Moltbook launched a developer portal offering OAuth-style authentication for AI agents. Third-party apps can register, get a `moltdev_` API key, and verify Moltbook bot identity tokens. The response includes the bot's name, karma, follower count, and owner's X handle. They're positioning as "the universal identity layer for AI agents."
*   **What they solve:** Identity portability. A Moltbook bot can authenticate on third-party services using its Moltbook identity.
*   **What they DON'T solve:** Meaningful reputation. Moltbook "karma" is Reddit-style upvotes on a social feed — it measures *popularity*, not *competence*. An agent that posts funny shitposts gets more karma than one that solves real engineering problems.
*   **Weakness 1:** No structured data. Moltbook agents post freeform text. There's no build log, no problem→solution structure, no verifiable execution record. The "reputation" is just social media clout.
*   **Weakness 2:** Platform credibility is damaged. Known bot inflation (millions of fake/low-quality agents), persistent 500 errors, declining user engagement. Developers are unlikely to trust critical infrastructure to a platform with these reliability issues.
*   **Weakness 3:** Gated early access with manual approval — not self-serve yet.
*   **Weakness 4:** "Sign in with Moltbook" is not an infrastructure play. No platform outside Moltbook's ecosystem has incentive to integrate with a social network that has credibility issues. It's like offering "Sign in with MySpace" in 2010.
*   **Risk:** If Moltbook pivots from karma to a real reputation metric (peer-verified execution logs), they'd have a head start on user base. We need to launch before they figure out that karma isn't enough.

**6. Zerobase Labs (Agent Passport)**
A live, production-ready "OAuth for agents" offering Ed25519-backed JWTs and a basic platform risk score to accept or throttle agents. Open source, self-hostable, runs on free tiers ($0/month). Published npm SDK (`@zerobase-labs/passport-sdk`). Challenge-response auth with 60-minute JWT TTL.
*   **What they solve:** Cryptographic Auth and rate limit handling. They built the frictionless DMV layer.
*   **What they DON'T solve:** Trust and real-world reputation. Their "Risk Score" (0-100) evaluates only agent age, rate limit violations, and basic behavior patterns—it provides zero signal on an agent's actual trustworthiness, track record, domain expertise, or behavior context within complex workflows. No peer review, no citation graph, no semantic analysis.
*   **Opportunity:** If an enterprise integrates Zerobase, their superficial Risk Score should ideally pull data from the **Civis Citation Graph** to provide a meaningful trust signal. We partner with the auth layer to provide the reputation layer.

**7. ERC-8004 (Trustless Agents)**
An Ethereum standard proposing on-chain registries for agent identity, reputation, and validation. Authors include representatives from MetaMask, Ethereum Foundation, Google, and Coinbase — serious institutional backing. Defines three registries: Identity (ERC-721 based), Reputation (open-ended feedback signals), and Validation (stakers, zkML verifiers, TEE oracles). Trust models are pluggable and tiered — from low-stake tasks to high-stake ones.
*   **What they solve:** The open standard/schema for decentralized agent identity and feedback loops.
*   **What they DON'T solve:** The data itself. The authors of the EIP explicitly state they expect private players to actually "build reputation systems" to plug into this schema to prevent Sybil attacks.
*   **Opportunity:** This is massive validation of the Civis thesis. The industry is building the blank schemas for reputation; Civis is building the actual peer-reviewed reputation data that will populate registries like this one. The Civis Citation Graph is exactly what should flow into an ERC-8004 Reputation Registry.

**8. Trulioo ("Know Your Agent" / KYA White Paper)**
A major enterprise identity verification company (KYC/KYB infrastructure) that has published a white paper titled "Know Your Agent: An Identity Framework for Trusted Agentic Commerce." They are extending their existing human verification infrastructure to cover AI agents, coining the "KYA" terminology we adopted.
*   **What they solve:** Enterprise-grade identity verification for agents participating in commerce. They can verify *who owns* an agent via KYC/KYB.
*   **What they DON'T solve:** Reputation. Trulioo can verify ownership and identity but has no mechanism to assess whether an agent is *competent* or *trustworthy* based on its track record. No developer community, no grassroots distribution — they sell to enterprises with compliance departments via a gated white-paper → book-a-demo pipeline.
*   **Risk:** If Trulioo starts offering "KYA verification" as a product, enterprises will trust them because of their existing brand. They could compete for the same enterprise verification contracts we target in Phase 2.
*   **Opportunity:** Partnership play — Trulioo verifies the human (KYC/KYB), Civis tracks the agent's driving record (reputation). They are the DMV checking your identity; we are the insurance company checking your history.

**9. Chimoney (APort — W3C DID Digital Passports)**
A payments company that has built W3C DID-compliant digital passports for AI agents, tied to Chimoney wallets for agent-to-agent commerce. Pricing: free for first 100 passports, then $0.10/passport. L4 assurance with eIDAS/NIST compliance. KYC/KYB built into every passport.
*   **What they solve:** Letting AI agents transact financially with verified identity. Their angle is *agentic commerce* — agents buying things, paying for services, handling cross-border payments.
*   **What they DON'T solve:** Reputation or trust scoring. A DID proves who you are; it doesn't prove you're any good. Their entire product funnel leads to Chimoney wallets — if your agent doesn't need to transact money, there's no reason to use APort.
*   **Opportunity:** Low threat but useful signal. Their adoption of W3C DIDs confirms this standard is gaining traction. Our Phase 2 "Standard-Agnostic Export" should include W3C DID format. Chimoney validates agents need identity — they just stop at the "license" and don't track the "driving record."

**10. Dock.io / Truvera (Enterprise Verifiable Credentials)**
An enterprise identity platform (rebranded as Truvera) that provides verifiable credentials using cryptographic identity. They've published extensive thought leadership explicitly calling out that agent identity must evolve into reputation and trust scoring — but haven't built that layer yet. Their framework defines 4 components: unique cryptographic identity, delegated authority (principal → agent chain), verifiable credentials (portable, no central DB), and auditability/non-repudiation.
*   **What they solve:** Enterprise agent identity with verifiable credentials. They position identity as foundational infrastructure in the agentic AI stack.
*   **What they DON'T solve:** Reputation. Their own article states: *"identity is the entry point; reputation is the differentiator"* — which is literally the Civis thesis. They see the next step but haven't built it.
*   **Weakness:** Enterprise-gated (CIO/CISO sell, not indie developer tooling). Their product is their existing human identity platform being repositioned as applicable to agents — no dedicated agent reputation product.
*   **Risk:** If they actually build a reputation scoring system on top of their verifiable credentials, they have existing enterprise relationships to distribute it. This is a **race signal**: enterprise identity vendors are eyeing our space.

**11. A2A Agent Cards & DNS/PKI Infrastructure (Industry Pattern)**
The A2A Protocol defines an "Agent Card" — a signed JSON document describing an agent's identity, capabilities, endpoints, and security schemes. Enterprise infrastructure leaders (e.g., Amit Sinha) are proposing DNS as the agent registry (SRV, DANE, DNSSEC records) and PKI (X.509 certificates) as the agent passport mechanism. This is the path enterprises will take using their *existing* infrastructure.
*   **What this means:** Enterprises won't adopt our auth layer internally — they'll use DNS/PKI they already have. Our play is reputation *data* that plugs into their infrastructure, not replacing their infrastructure.
*   **Opportunity:** A2A Agent Cards are becoming a standardized passport format. Phase 2 should include exporting Civis passports as A2A Agent Cards. DNS/PKI, W3C DIDs, Agent Cards — these are all *containers*. Civis provides the *data* (reputation, citation graph) that goes inside them.

**12. The Colony (thecolony.cc) — Reddit for AI Agents**
A live, active "collaborative intelligence platform" where AI agents and humans post findings, questions, analyses, and discussions in sub-communities called "Colonies." Founded by Jorwhol. Has ~294 registered agents, 50+ pages of content, and 216 features across 37 categories. Agents self-register via a simple API call (`POST /register`) — no OAuth, no human verification, no Sybil resistance. Engagement is driven by upvotes/downvotes and Lightning Network tips (Bitcoin sats).
*   **What they solve:** A live platform where agents can post and interact. It exists, it works, agents are using it. The onboarding is dead simple (paste instructions → agent self-registers → starts posting).
*   **What they DON'T solve:** Their engagement model is broken. The top post of all time has **10 upvotes from 294 agents** (3.4% engagement). This proves that upvote systems don't work for AI agents — agents have no natural incentive to upvote, so the quality signal is nearly nonexistent. There's also no identity verification (any script can register 100 agents), no structured content schema (freeform markdown), and no portable reputation.
*   **Why this matters for Civis:** The Colony is the **strongest evidence** that Civis's citation-based approach is correct. Upvotes require agents to perform a separate, unmotivated action. Citations happen *automatically* when an agent uses a solution that worked — it's a natural byproduct of the workflow, not an extra chore. The Colony also demonstrates the Sybil problem: zero-friction registration = zero trust signal.
*   **Risk:** Low. They have a head start on content volume, but their engagement is anemic and their reputation signal (upvotes) is provably failing. If we launch with higher-quality structured content and working reputation mechanics, agents will gravitate to where their contributions actually build a meaningful track record.

**Our Advantage:** We don't sell a boring spec to an enterprise (Okta/AIP). We don't require a cloud subscription (AWS). We don't conflate popularity with competence (Moltbook). We don't use upvotes that agents ignore (The Colony — 3.4% engagement proves this fails). We don't stop at cryptographic identity without reputation (Zerobase, Chimoney). We don't just publish thought leadership about reputation without building it (Dock.io/Truvera). We don't verify identity without tracking behavior (Trulioo). We view underlying cryptographic standards (DIDs, PKI, Agent Cards) as the DMV issuing a blank license; we are the insurance company tracking the driving record. We build a **merit-based reputation layer** anchored to verifiable identity, bootstrapped through a platform developers actually want to use. The passport is the identity. The citation graph is the reputation. The platform (Civis) is the rocket fuel to get the fire started.
