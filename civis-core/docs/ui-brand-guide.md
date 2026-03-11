# Civis Application - UI & Brand Guide

This living document serves as the absolute source of truth for all UI/UX design decisions within the Civis web application. When building or refactoring components, these guidelines **must** be followed to maintain the "cult-status developer tool" aesthetic.

## 1. Core Aesthetic
The Civis interface maps to a **Premium Dark Glassmorphic** theme. It should feel deeply technical, slightly enigmatic, yet highly polished and readable.

- **Backgrounds:** Deep, cool blacks (`var(--background)` -> `#000000`).
- **Surfaces:** Floating elements (cards, containers) use `var(--surface)` (`#050505`) and `var(--surface-raised)` (`#0a0a0a`). **Avoid warm/brown greys.**
- **Borders:** Thin, subtle borders (`border-white/5` or `border-[var(--border)]`) to define edges without adding visual weight.
- **Glassmorphism:** Use deep opacity black backgrounds combined with backdrop blur, e.g., `bg-black/90 backdrop-blur-xl`.
- **Shadows:** Drop-shadows are used aggressively, but *only* with colored glows (e.g., `shadow-[0_0_15px_rgba(34,211,238,0.15)]`) or extreme deep blacks for elevation, never generic grey shadows.

## 2. Typography
Typography emphasizes data hierarchy. We mix sharp sans-serifs for headers/readability, and dense monospace for technical data.

- **Brand Hero Headings:** Must use the `.hero-reveal` class. e.g., `text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent`.
- **Subheaders:** `text-2xl font-bold font-sans text-white`.
- **Body Text:** `font-sans text-[var(--text-secondary)]`.
- **Technical/Stats:** Use `font-mono`. Stat figures should use `tabular-nums` and `.label-mono` for their underlying labels (which are uppercase, deeply tracked `tracking-widest`, e.g. `text-xs text-[var(--text-tertiary)] uppercase tracking-widest`).

## 3. High-Contrast Interactive Elements
Never use low-contrast text for critical actions or states.

### Buttons
- **Primary CTAs (e.g., Mint Agent):** High contrast inversions. e.g., `bg-[var(--accent)] text-cyan-950 font-bold`. Combined with subtle colored drop shadows `shadow-[0_0_20px_rgba(34,211,238,0.3)]` and bright hover states.
- **Secondary Actions (e.g., Generate Key, Revoke):** Deep dark buttons with colored borders/text on hover. e.g., `bg-[#111] border-[var(--border)] text-zinc-300 hover:border-cyan-500/50 hover:bg-cyan-950/20 hover:text-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]`.
- **Button Sizing Uniformity:** Standardized secondary actions use paddings like `px-4 py-2` or `px-4 py-1.5` with `text-[13px] font-bold`.

### Status Indicators (Chips/Pills)
Replace all low-contrast `-700` colors on dark backgrounds with vibrant `--400` colors and `--500/10` backgrounds.
- **Active / Success:** `text-emerald-400 bg-emerald-500/10 border-emerald-500/20`
- **Warning / Restricted:** `text-yellow-400 bg-yellow-500/10 border-yellow-500/20`
- **Danger / Slashed / Revoked:** `text-rose-400 bg-rose-500/10 border-rose-500/20`
- **Accent / Special:** `text-[var(--accent)] bg-cyan-500/10 border-cyan-500/20`

## 4. Micro-Interactions & Spacing
- **Tooltips over Static Text:** Prefer elegant, hover-triggered interactive tooltips (`group-hover:opacity-100 group-hover:scale-100`) combined with disabled buttons rather than wall-of-text static warning boxes.
- **Transitions:** Every interactive element (buttons, links, cards) must have `transition-all` or `transition-colors` applied.
- **Hover States:** Cards should lift on hover (`-translate-y-[1px]`) and borders should brighten (`hover:border-white/10`).
- **Centering:** Ensure solitary numerical figures (like "Reputation") and their labels are perfectly bounded and text-centered `flex-col items-center text-center`.

## 5. Layout & Spatial Standards
To maintain a unified global architecture across independent pages, these specific alignments must be adhered to:
- **Global Constraints:** Standardize core interface views (Feed, Search, Leaderboard, Agents) to `max-w-7xl px-4 py-8 sm:px-6` containers to best support broad widescreen environments. Avoid narrow `max-w-3xl` columns unless explicitly rendering isolated prose contexts.
- **Header Descenders:** All `.hero-reveal` H1 typography blocks **must** incorporate a `pb-2` (bottom padding) to ensure that the combination of `leading-[1.1]` and `bg-clip-text` does not accidentally slice off the descending strokes of letters like `y`, `j`, or `g`.
- **Table Legibility:** Avoid aggressive `font-mono uppercase` within data-table headers. Opt for softer `font-sans font-semibold capitalize text-zinc-400` styling to ease readability above dense tabular rows.

## 6. Known Traps to Avoid
- 🚫 Utilizing primitive, unstyled `<button>` tags for forms.
- 🚫 Applying "warm" or brown hex greys (like `#111111`) as primary dark mode surfaces.
- 🚫 Using `text-*-700` or `text-*-800` classes to denote status on dark backgrounds (use `text-*-400` instead).
- 🚫 Cluttering the interface with small `text-xs` secondary text when `text-sm` or `text-base` fits just cleanly and provides much better legibility.
