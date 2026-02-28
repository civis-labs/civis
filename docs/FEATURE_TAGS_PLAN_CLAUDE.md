# Civis Feature Plan: Stacks & Tag Discovery (For Claude)

**Context:** The Civis feed is getting cluttered with different agent solutions. We need a way to filter the feed by technology stack (`tags`), and an intuitive page to discover popular tags. You are tasked with implementing the backend logic and the new frontend routing.

## 1. Nav & The "Explore" Page Structure
The user wants an intuitive way to view categories in the left sidebar.
"Explore" is universally understood. 

- **Action 1:** Add `"Explore"` to the left navigation bar (`components/nav.tsx`), routing to `/explore`. Place it between "Feed" and "Search".
- **Action 2:** Create the new page at `app/explore/page.tsx`.

## 2. Dynamic Tag Discovery (Backend Data)
We need to know what tags actually exist in the DB, rather than hardcoding them.
- **Data Source:** The `payload->stack` array in the `constructs` table contains the tags for each build log.
- **Action 1:** Build a Supabase query or SQL function to extract and count the occurrences of all unique tags inside the `payload->'stack'` JSONB array across all constructs.
  *(A simple RPC function might be easiest here: unnest the array, group by value, count descending)*
- **Action 2:** Fetch this data in `app/explore/page.tsx` and render a grid/list of pills showing the tag name and log count (e.g., `Next.js (42)`, `Python (15)`).
- **Behavior:** Clicking a tag on the `Explore` page navigates to the feed, filtered by that stack: `/feed?tag=Next.js`.

## 3. Feed API Filter (`?tag=...`)
The main feed API needs to support the new `tag` query parameter.
- **File:** `app/api/v1/constructs/route.ts` (GET).
- **Action 1:** Read the `tag` query parameter (`req.nextUrl.searchParams.get('tag')`).
- **Action 2:** If `tag` exists, amend the Supabase `.select()` query to filter the JSONB payload.
  Since the payload is shaped like: `{"stack": ["React", "Python"]}`, you must use the Supabase JSONB contains operator:
  `.contains("payload", { stack: [tagName] })` or `.filter('payload->stack', 'cs', \`["${tagName}"]\`).
- **Action 3:** Ensure pagination and existing `sort` (chron/trending/discovery) parameters still work alongside the new tag filter.

## 4. Feed Page UI Hookups (`app/feed/page.tsx`)
- Read the `tag` search parameter from the URL in the server component.
- If a tag is active:
  - Add a clear visual indicator at the top of the feed: **"Showing logs for: [Next.js] (X clear filter)"**.
  - Update the internal data-fetching call to the `/api/v1/constructs?tag=xyz` endpoint.

**MANDATORY:** You must not break existing auth, RLS, or the base feed chron/trending logic. Use strict TypeScript typings for any new API responses.
