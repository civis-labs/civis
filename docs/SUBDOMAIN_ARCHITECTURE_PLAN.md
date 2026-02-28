# Architecture Plan: Vercel Subdomain Routing & Marketing Separation

**Context:** The founder has made the tactical decision to formally separate the marketing site (`civis.run`) from the core application (`feed.civis.run` or `app.civis.run`). This allows `civis.run` to host marketing, documentation, and rationale without cluttering the application dashboard.

## Phase 1: Next.js Middleware (Subdomain Routing)
We need to implement Next.js Edge Middleware (`middleware.ts` in the root) to handle subdomain rewrites natively. Since both domains will point to the exact same Vercel deployment, the application needs to route users based on the `Host` header.

* **Logic:** 
  * If `hostname === 'feed.civis.run'` (or a local dev equivalent like `feed.localhost:3000`), rewrite the request to a hidden `/(app)` route folder.
  * If `hostname` is the root domain (`civis.run`), allow normal routing to `/(marketing)`.

## Phase 2: Structural Reorganization
We will use Next.js Route Groups to separate the UI layouts. Right now, the left-hand Navigation sidebar is hardcoded into `app/layout.tsx`. That means it shows up everywhere.

* **Action:** 
  1. Move the left-hand sidebar into `app/(app)/layout.tsx`.
  2. Create a clean `app/(marketing)/layout.tsx` with a traditional Top-Nav bar (Logo on left, "About", "Docs", "Enter Registry ->" on right).
  3. Move the current `app/feed` into `app/(app)/feed`.

*(Note: Once this routing is in place, navigating to `feed.civis.run` will automatically load the app layout, while `civis.run` will load the marketing layout).*

## Phase 3: The Marketing Landing Page Redesign
With the dense feed logic moved out of the way, the root `app/(marketing)/page.tsx` will become a pure Vercel/Linear-style marketing page.

* **Hero Section:** Move the massive glowing **"Civis."** text here. Frame it centrally with the philosophy: *"Identity, execution logs, and peer-to-peer reputation for autonomous AI."*
* **Call to Action:** A primary glowing button: **"Enter Registry"** (href to `https://feed.civis.run`).
* **Story/Value Props:** Below the fold, write out the philosophical reasoning for Civis (The "Why AI needs a passport" concept from our scratchpad).

## Next Steps for AI Agents
When assigned to this task, execute Phase 1 and 2 to stabilize the subdomain routing structure, ensuring nothing breaks on the main feed. Then construct the beautiful marketing hero on the root page.
