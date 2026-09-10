# ترندز (Trends) — Iranian Clothing E-commerce

Production rebuild of the supplied Persian/RTL storefront prototype into a real
Next.js + PostgreSQL e-commerce application.

This repository is being built incrementally, one phase at a time, following
`docs/CLAUDE_BUILD_INSTRUCTIONS.txt`. See `PROGRESS.md` for current status —
**always read `PROGRESS.md` before starting new work.**

## Repository layout (target — filled in phase by phase)

```
docs/                    Reference documents (project context, build instructions)
reference/
  prototype.html         The original supplied prototype. Design/interaction source
                          of truth. Not edited — only read for parity checks.

src/
  app/                    Next.js App Router routes (created in Phase 1+)
  components/
    ui/                   Generic reusable primitives (Button, Card, Input, ...)
    layout/               Header, footer, containers, drawers
  domains/                One folder per business domain (see below). Each domain
                           owns its own server actions / queries / validation /
                           business rules. UI components stay presentational and
                           call into domains, never into the database directly.
  lib/
    db/                   Drizzle client + schema (Phase 3)
    validation/           Shared Zod schemas
    auth/                 Auth/session helpers
    utils/                Formatting (money, Persian digits, dates), misc helpers
  styles/                 Global CSS / design tokens that don't fit Tailwind

public/assets/            Static media (hero, categories, products, icons).
                           NOTE: prototype-referenced files (banner-1.webp,
                           banner-2.webp, category-*.webp) are NOT yet supplied
                           — see "Missing assets" below.

drizzle/migrations/       SQL migrations (Phase 3+)
tests/                    unit / integration / e2e (Phase 14, populated earlier
                           as business-critical logic is written)
```

### Domain boundaries (`src/domains/*`)

catalog, categories, inventory, customers, auth, wishlist, cart, checkout,
addresses, orders, payments, shipping, promotions, reviews, notifications,
content, newsletter, support, admin, analytics.

Each domain is expected to eventually contain its own `schema.ts` (Drizzle
tables it owns), `service.ts` (business rules), `actions.ts` (Server Actions),
and `validation.ts` (Zod schemas) as those phases are implemented. Empty
domains currently hold only a `.gitkeep` placeholder.

## Status

Phase 1 (Next.js foundation + design system shell) is complete and was
verified with a working build. Phase 2 (homepage visual migration) has
been implemented — hero carousel, categories, featured products, promo
banners, new arrivals, benefits strip, search overlay, and cart drawer
are all real components now — but could not be run through
`npm install`/`build`/`lint`/`typecheck` in the session that wrote it
(sandbox network restriction). **Run those checks first** before trusting
this is bug-free; see `PROGRESS.md` for full detail on what was and
wasn't verified.

## Getting started

```
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint        # eslint .
npm run typecheck   # tsc --noEmit
```

Copy `.env.example` to `.env.local` before wiring up anything from Phase 3
onward (database, auth, payments) — nothing in the app currently reads
environment variables yet, so this isn't required to run Phase 1's code.
