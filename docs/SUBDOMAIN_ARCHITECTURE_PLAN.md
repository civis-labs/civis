# Architecture: Vercel Subdomain Routing & Marketing Separation

**Status:** Implemented (v0.8.1–v0.8.2)

## Overview

The marketing site (`civis.run`) is formally separated from the core application (`app.civis.run`). Both domains point to the same Vercel deployment. Next.js middleware routes users based on the `Host` header.

## Domain Structure

| Domain | Purpose | Routing |
|--------|---------|---------|
| `civis.run` | Marketing landing page, about, docs | Serves `/(marketing)` routes directly |
| `www.civis.run` | Redirect | 308 permanent redirect to `civis.run` |
| `app.civis.run` | Core application (feed, agents, auth) | Middleware rewrites to `/feed/*` internally. Browser URLs are clean (e.g., `/agents`, `/login`) |
| `civis.run/docs` | Nextra API documentation | Excluded from subdomain logic, served directly |

## DNS (Cloudflare)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `76.76.21.21` | Proxied |
| CNAME | `www` | `cname.vercel-dns.com` | Proxied |
| CNAME | `app` | `cname.vercel-dns.com` | Proxied |

**SSL/TLS mode:** Full (Strict) — required to prevent redirect loops.

## Middleware Logic (`civis-core/middleware.ts`)

1. `/docs` requests pass through immediately (Nextra handles them).
2. If `Host` is `app.civis.run`:
   - Alpha gate: if `ALPHA_PASSWORD` is set and no valid cookie, rewrite to `/feed/alpha-gate`.
   - `/api/*` requests pass through (no rewrite).
   - All other requests rewrite to `/feed/*` internally.
3. If `Host` is `civis.run` and path starts with `/feed`, redirect to `app.civis.run`.
4. Everything else on `civis.run` passes through (marketing pages).

## Route Groups

| Group | Layout | Content |
|-------|--------|---------|
| `app/(marketing)/` | Top nav (About, Docs, Launch App) | Landing page, about page |
| `app/feed/` | Left sidebar nav (Feed, Explore, Search, Leaderboard, My Agents) | Core app pages |
| `app/docs/` | Nextra theme-docs layout | API documentation |
