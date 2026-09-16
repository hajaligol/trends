# ترندز (Trends) — Iranian Clothing E-commerce

A production-grade, Persian/RTL Next.js + PostgreSQL e-commerce application,
built incrementally from a supplied HTML/CSS prototype following
`docs/CLAUDE_BUILD_INSTRUCTIONS.txt`'s 15-phase plan. **Phases 0–14 are
complete.** See `PROGRESS.md` for the authoritative, detailed status —
always read it before starting new work; this README is a map, not the
source of truth.

## What this is

A customer can discover products, search/filter, inspect size/color
variants, maintain a wishlist, create an account, save Iranian addresses,
check out, receive an order record, track order status, and read shipping/
returns/privacy/terms policies. A store operator can manage the catalog,
inventory, orders, promotions, reviews, homepage content, newsletter
subscribers, and settings from `/admin`, with every privileged action
server-authorized and audited.

**Not production-ready to accept real money as-is** — see
`docs/PRODUCTION_CHECKLIST.md` for the exact, itemized list of what's
launch-blocking (a real Iranian payment gateway, real shipping fees, legal
review of policy copy) versus what's a documented, acceptable-for-now
limitation (single-process deployment topology, no CDN yet).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL at minimum
npm run db:migrate           # apply schema to your PostgreSQL database
npm run db:seed              # optional — demo catalog data for local dev
npm run dev                  # http://localhost:3000
```

Checks:

```bash
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint .
npm test                     # unit tests (no database needed)
npm run test:integration     # integration tests (needs a real, migrated Postgres — reads DATABASE_URL from .env.local)
npm run test:all             # both suites
npm run build                # production build (needs a reachable, migrated DATABASE_URL — see docs/DEPLOYMENT.md)
```

`npm run db:studio` opens Drizzle Studio against `DATABASE_URL` for direct
inspection.

## Repository layout

```
docs/                        Reference docs: project context, build instructions,
                              deployment, production checklist, backup/migration
                              strategy, observability plan (this list, below)

src/
  app/                        Next.js App Router routes — storefront, /account,
                               /admin, /api. error.tsx / global-error.tsx /
                               not-found.tsx are the app-wide error/404 boundaries.
  components/
    ui/                        Generic reusable primitives (Button, Container, ...)
    layout/                    Header, footer
    overlays/                  Cart drawer, search overlay (modal dialogs — see
                                src/lib/hooks/useDialogA11y.ts)
    home/, cart/, admin/, ...  feature-area components
  domains/                     One folder per business domain — see below. Each
                                owns its queries/actions/validation; UI components
                                stay presentational and call into domains, never
                                into the database directly.
  lib/
    db/                        Drizzle client + schema + seed script
    validation/                Shared Zod schemas
    auth/                      NextAuth v5 config (JWT sessions, no adapter)
    security/                  Rate limiting
    hooks/                     Shared client-side hooks (dialog focus trap, etc.)
    utils/                     Money/phone/Persian-digit formatting, misc helpers
  styles/                      Global CSS / design tokens

drizzle/migrations/           SQL migrations, 0000–0007 (one set of changes per
                               schema-changing phase)
tests/
  unit/                       Pure-function tests, no database (npm test)
  integration/                Real-Postgres tests: inventory/coupon race
                               conditions, payment-callback idempotency,
                               cross-user ownership (npm run test:integration)
public/assets/                Product/category/hero images carried over from
                               the prototype
```

### Domain boundaries (`src/domains/*`)

`catalog`, `categories`, `inventory`, `customers`, `auth`, `wishlist`,
`cart`, `checkout`, `addresses`, `orders`, `payments`, `shipping`,
`promotions`, `reviews`, `notifications`, `content`, `newsletter`,
`support`, `admin`, `analytics`, `customer-experience`.

## Documentation index

- **`PROGRESS.md`** — the authoritative phase-by-phase build log. Read
  this first, always.
- **`docs/TRENDS_PROJECT_CONTEXT.md`** — product/business requirements.
- **`docs/CLAUDE_BUILD_INSTRUCTIONS.txt`** — the 15-phase build plan and
  non-negotiable engineering rules this codebase follows.
- **`docs/DEPLOYMENT.md`** — how to actually run this in production,
  including the single-process deployment constraint and required
  environment variables.
- **`docs/PRODUCTION_CHECKLIST.md`** — itemized, honestly-labeled
  (DONE / BLOCKING / PRE-LAUNCH) production readiness checklist.
- **`docs/BACKUP_AND_MIGRATIONS.md`** — migration workflow and database
  backup/restore strategy.
- **`docs/OBSERVABILITY.md`** — what logging/audit trail exists today
  versus what a future phase should add (error tracking, health checks,
  alerting).

## Known, honestly-documented limitations

This codebase has never had browser automation available in any session —
every phase verified Server Actions and pages via direct-to-domain calls,
real `FormData` submitted straight to exported Server Action functions, and
`curl` with real session cookies, rather than clicking through a rendered
browser. This is real coverage, not a substitute for it — see
`docs/PRODUCTION_CHECKLIST.md`'s "Known sandbox limitation" section before
launch. `PROGRESS.md`'s "Known Issues / Technical Debt" section has the
complete, cumulative, phase-by-phase list of every other known gap (no
guest checkout, mock-only payment provider, placeholder shipping fees,
un-reviewed policy copy, and more) — nothing here is hidden or
undocumented.
