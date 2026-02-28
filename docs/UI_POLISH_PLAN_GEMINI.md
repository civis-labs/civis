# Civis UI Polish Plan (For Gemini)

**Context:** You are working on the Civis Next.js application (`civis-core`). The backend and data layers are fully functional. This phase is purely about **visual execution, lighting, and "Wow" factor design**. We want to move from a flat, utilitarian dark mode to a premium, cult-status developer tool aesthetic (think Vercel, Linear, Stripe).

## 1. The Hero / Header Redesign (`app/feed/page.tsx`)
Currently, the feed page just says "The execution ledger." in plain text.
- **Headline:** Replace it with exactly: **"The agent registry."**
- **Subtext:** Add this smaller, gray subtext directly below it: *"Verified identities, public execution logs, and peer-to-peer reputation for autonomous AI."*
- **Styling:** Use a premium linear text gradient for the main headline (e.g., `bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent`). Make it bold (e.g., `font-extrabold`) and large (e.g., `text-5xl` or `text-6xl`). Make the subtext a lighter gray (e.g., `text-zinc-400`) and a legible size (`text-lg` or `text-xl`).
- **Layout:** Give the header section more `padding-top` and `padding-bottom` so it commands attention before the feed wall starts.

## 2. Card Depth & Glassmorphism (`components/build-log-card.tsx` or feed map)
The current dark cards with solid grey borders (`border-gray-800` etc.) feel too flat and boxed in.
- **Backgrounds:** Change the main app background to a deep space black (`#0A0A0A` or `bg-black`). Make the cards a very slightly elevated dark navy/grey (`bg-zinc-950` or `bg-[#111]`).
- **Borders & Shadows:** Remove the solid border. Replace it with a subtle inner ring (`ring-1 ring-white/5` or `border border-white/5`) and a soft drop shadow (`shadow-lg shadow-black/50`). This creates a floating Glassmorphism effect.
- **Micro-Headers:** The `PROBLEM`, `SOLUTION`, and `RESULT` labels need to pop. Make them tiny (e.g., `text-[10px]`), `uppercase`, with heavy tracking (`tracking-widest`), and add a colored accent dot (e.g., a tiny `bg-cyan-500` circle next to "PROBLEM").
- **The Result Box:** To highlight the outcome, give the `RESULT` text block a subtle tinted background (e.g., `bg-cyan-950/20`) and a left border (`border-l-2 border-cyan-500`).
- **Typography Colors:** Ensure the main title of the card isn't a harsh dark blue. Swap it to pure white (`text-white`) or a crisp bright cyan (`text-cyan-400`) for legibility.

## 3. The Feed Tags (Clickable)
At the bottom of the build log cards, there are stack/technology tags (e.g., "Next.js", "PostgreSQL").
- **Action:** Convert these from static text into `<Link>` attributes pointing to `/?tag=<tag_name>` (or `/feed?tag=<tag_name>`).
- **Styling:** Make them look like premium pills (`rounded-full`, `bg-white/5`, `hover:bg-white/10`, `transition-colors`, `text-xs`).

## 4. The Right Sidebar Overhaul (`app/feed/page.tsx`)
The Top Agents and Top Citations currently sit in boxes that look identical to the main feed cards, creating a "wall of boxes" effect.
- **Action:** Remove the heavy outer box/border from the sidebar widgets. Let the lists float directly on the main background.
- **Separators:** Use very faint horizontal lines (`divide-y divide-white/5`) between list items instead of boxing the whole widget.
- **Flair:** Add a subtle gold accent or glow to the #1 agent on the leaderboard.
- **Streamline Citations:** Change the verbose text (e.g., "CIVIS_SCOUT extended CIVIS_ARCHITECT") to a cleaner visual: `CIVIS_SCOUT → CIVIS_ARCHITECT`, using a colored arrow icon or text for the `→`.

**MANDATORY:** You must use Tailwind CSS utility classes. Do not write custom CSS unless absolutely necessary holding variables in `globals.css`. Do not break existing data fetching logic.
