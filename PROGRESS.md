# Trends Progress Report

## Current Status
- Overall status: Homepage is visually complete (demo data). The catalog
  domain now has a real PostgreSQL schema, migrations, seed data, and a
  data-access layer — verified end-to-end against a live database this
  session. The homepage itself still renders from the Phase 2 demo-data
  fixtures (swapping it to the new DB-backed queries is Phase 4's job,
  not this phase's).
- Current phase: PHASE 3 — Database + catalog domain (COMPLETE)
- Last completed phase: PHASE 3 (verified this session)
- Next phase: PHASE 4 — Storefront catalog pages
- Date: 2026-09-10

## Completed

### Phase 0 — Repository audit + implementation plan
Prototype structure, design tokens, missing assets, and architecture
decisions were audited. See git history for the full write-up if needed;
nothing here changed this session.

### Phase 1 — Next.js foundation + design system shell
Next.js App Router + TypeScript + Tailwind v4 foundation, design tokens
ported verbatim from the prototype, Header/Footer shell, Button/Container
primitives. Verified passing at the time.

### Phase 2 — Homepage visual migration (verified COMPLETE this session)
Rebuilt every homepage section from `reference/prototype.html` as React
components (hero carousel, category nav, featured products, promo
banners, new arrivals, benefits strip, search overlay, cart drawer),
reading from `src/domains/catalog/demo-data.ts` / `src/domains/cart/demo-data.ts`
fixtures. Full write-up of what was built is in git history from the
Phase 2 session; this session's job was to actually **verify** it, since
the prior session's sandbox had zero network access and couldn't run
`npm install`.

**This session's Phase 2 verification:**
- `npm install` succeeded (376 packages, 0 vulnerabilities at the time).
- `npm run typecheck` caught one real bug: `HeroCarousel.tsx`'s
  `clientXOf()` helper read `event.touches[0].clientX` without a null
  check — `tsconfig.json`'s `noUncheckedIndexedAccess: true` correctly
  flagged `event.touches[0]` as possibly `undefined` (TypeScript doesn't
  know a `touchstart`/`touchmove` event always has at least one touch
  point at the type level). Fixed with a safe fallback to
  `changedTouches[0]?.clientX ?? 0`.
- `npm run lint` — clean, no errors/warnings.
- `npm run build` — clean production build (`next build` with Turbopack),
  static homepage + not-found page generated successfully.
- `npm run dev` + `curl`'d the rendered HTML directly and inspected it:
  - `<html lang="fa" dir="rtl">` confirmed.
  - All six homepage sections present with correct IDs (`#hero`,
    `#categories`, `#featured`, `#collections`, `#new-arrivals`,
    `#benefits`) and correct Persian copy/digit formatting
    (e.g. `۵۹۰,۰۰۰ تومان`, `۱ از ۲` on the hero carousel's ARIA labels).
  - The cart drawer rendered in its correct **closed** state
    (`translate-x-full pointer-events-none aria-hidden="true"`),
    confirming last session's fix for the "drawer pops open instantly
    instead of sliding in" bug actually works.
  - No hydration warnings or errors in the dev server log.
- **Phase 2 is now genuinely verified, not just code-complete.**

### Phase 3 — Database + catalog domain (COMPLETE)

**Goal:** stand up the production catalog data model (categories,
products, variants, images), get it running against a real PostgreSQL
database with migrations, seed it with the Phase 2 demo content, and add
a repository layer other code can query through.

**Environment note (read before assuming this needs setup elsewhere):**
This sandbox had `apt-get` access to Ubuntu's package archives, so
PostgreSQL 16 was installed and run *locally in this sandbox* to actually
verify migrations/seed/queries end-to-end, rather than just generating
SQL and hoping it's correct. This local Postgres instance and the
`.env.local` file pointing at it (`postgresql://postgres:postgres@localhost:5432/trends`)
are **sandbox-local artifacts, not part of the deliverable** — they will
not exist in whatever environment runs the next session or production.
`.env.local` is git-ignored (already covered by the existing
`.env*.local` rule in `.gitignore`) and was never intended to be
committed. The next session (or a real dev machine) needs its own
PostgreSQL instance and its own `.env.local` — see "Commands" below.

**New dependencies added** (`package.json`):
- `drizzle-orm`, `postgres` (runtime).
- `drizzle-kit`, `tsx`, `dotenv`, `@types/pg` (dev). `dotenv` and `tsx`
  were added as *explicit* devDependencies even though they're also
  transitive deps of `drizzle-kit` — relying on a transitive package's
  binary being hoisted correctly is fragile; explicit is safer per rule
  F.6 ("prefer fewer dependencies" is about not adding *unnecessary*
  ones, not about avoiding declaring what you actually use).
- `npm audit` reports 4 moderate vulnerabilities, all from
  `drizzle-kit`'s bundled `esbuild-kit` → `esbuild` dev-server chain
  (GHSA-67mh-4wv8-2f99 — a dev-only issue where any website could send
  requests to esbuild's dev server). `drizzle-kit` is already pinned to
  its latest version (0.31.10); the vulnerable `esbuild` is nested
  further down and not something this project's own code touches at
  runtime (it's a CLI/dev tool, never shipped or run in production).
  Not fixed further this session — flagged here for Phase 13's
  dependency-vulnerability review rather than forcing a breaking
  `drizzle-kit` downgrade (`npm audit fix --force` wants to install
  `drizzle-kit@0.18.1`, an *older* version, to "fix" this, which would be
  a regression).

**New files — schema** (`src/lib/db/schema/`):
- `categories.ts`: `categories` table. Self-referencing `parent_id` (via
  `AnyPgColumn` callback pattern, the standard Drizzle idiom for
  self-referencing FKs) supports subcategories without a second table.
  Unique index on `slug`.
- `products.ts`: `products` table. Deliberately holds **no price or
  stock** — see the file's header comment; those live on variants only,
  per TRENDS_PROJECT_CONTEXT.md §6 ("use variants for combinations...
  rather than pretending one product has one universal stock number").
  `tags` is a plain Postgres `text[]` column rather than a tags/join-table
  pair — documented in-file as a deliberate simplification (rule F.5/F.6),
  not an oversight; revisit if a future phase needs tag reuse/analytics.
  Unique index on `slug`; indexes on `category_id`, `is_active`,
  `is_featured`, `is_new_arrival` (all things Phase 4/5 will filter/sort
  by).
- `product-variants.ts`: `product_variants` table — the actual sellable
  unit (size × color × material combination). `price_toman` /
  `compare_at_price_toman` are **integers**, never floats. See the file's
  header comment for the money-unit reasoning: Toman (not Rial) is this
  store's canonical unit, documented explicitly per
  TRENDS_PROJECT_CONTEXT.md §5's requirement to make that choice
  explicit in code. Non-negativity enforced via **database CHECK
  constraints** (`price_toman >= 0`, `compare_at_price_toman IS NULL OR
  >= 0`, `stock >= 0`), not just application code — verified this
  session (see "Tests/checks"). Uniqueness enforced via a unique index on
  `sku` and a compound unique index on `(product_id, size, color)` so the
  same product can't get two variants with an identical size/color
  combination — also verified this session. `stock` here is a simple
  on-hand integer for catalog display (in-stock/low-stock/out-of-stock);
  reserved-stock tracking, movement/audit trail, and concurrency-safe
  decrement-on-checkout are explicitly out of scope for this phase (that's
  Phase 8's job per TRENDS_PROJECT_CONTEXT.md §6/§8) — documented in-file
  so nobody mistakes this for the final inventory model.
- `product-images.ts`: `product_images` table. `variant_id` is nullable —
  most images belong to the whole product, but it can be scoped to one
  variant for color-specific product photography. No rows seeded this
  phase (see seed script notes below) — the schema exists and is ready,
  but there's no real product photography to point it at yet.
- `index.ts`: barrel re-exporting all schema tables/relations/types for
  both `drizzle.config.ts` and `src/lib/db/client.ts` to import from a
  single path.

**New files — infrastructure:**
- `src/lib/db/client.ts`: the shared Drizzle + `postgres` client. Throws
  loudly at import time if `DATABASE_URL` is unset (fail-fast over
  lazy/confusing runtime failures). Caches the connection pool on
  `globalThis` outside production so Next.js dev-mode hot-reload doesn't
  open a new pool on every file edit — the standard pattern for
  connection-based drivers under Next.js.
- `drizzle.config.ts`: `drizzle-kit` config (dialect `postgresql`, schema
  path, migrations output to `drizzle/migrations`). Loads `.env.local` via
  `dotenv` itself, since `drizzle-kit` runs as a bare CLI outside of
  Next.js's own env-loading.
- `drizzle/migrations/0000_nice_exodus.sql` (+ `meta/` snapshot/journal):
  the actual generated migration creating all four tables, their indexes,
  FKs, and CHECK constraints. Generated via `npx drizzle-kit generate` and
  **applied** via `npx drizzle-kit migrate` against the local Postgres —
  verified with `\dt` / `\d product_variants` in `psql` (see "Tests/checks").
- `src/lib/db/seed.ts`: seed script. Truncates the four catalog tables (in
  FK-safe child-to-parent order) and re-inserts from
  `src/domains/catalog/demo-data.ts`, so local dev data matches exactly
  what the (still demo-data-driven) homepage shows. Notable decisions,
  documented in the file itself:
  - **Category assignment is a Phase-3 assumption.** The demo fixtures
    were written for a flat homepage grid and never carried a
    per-product category. Each of the 11 demo products was assigned to
    the single most plausible category by name (e.g. "بافت زنانه" →
    women, "کتانی مینیمال" → shoes) via a `PRODUCT_CATEGORY_SLUG` map at
    the top of `seed.ts`. This is seed data, not a real merchandising
    decision — flagging clearly so nobody mistakes it for one.
  - **Variant generation is a Phase-3 assumption.** The demo fixtures
    have no size data at all. Featured products (no `swatches` field)
    get one generic variant (size "M", color "پیش‌فرض"). New-arrival
    products (which do have a `swatches: string[]` field) get one
    variant per swatch color, all sharing size "Standard" and the same
    price. This exactly reflects what the fixtures contain; it is not a
    real clothing size run and shouldn't be read as one.
  - **No `product_images` rows are seeded.** No real product photography
    exists yet (`public/assets/products/` is still `.gitkeep`-only).
    Inventing fake image URLs pointing at files that don't exist was
    judged worse than leaving the table empty — product cards already
    fall back to `AssetSlot` placeholders when a product has no images
    (Phase 2's `ProductCard.tsx`), so this is a safe, visible gap rather
    than a silent lie.
  - Persian-digit price strings (e.g. `"۵۹۰,۰۰۰ تومان"`) are parsed to
    plain integers (`590000`) via a small `parseTomanPrice()` helper that
    maps Persian digits to Arabic-numeral equivalents before stripping
    non-digit characters. Verified correct against every seeded price
    (see "Tests/checks").

**New files — data access layer** (`src/domains/catalog/queries.ts`):
- `getActiveCategories()`, `getFeaturedProducts()`, `getNewArrivals()`,
  `getProductBySlug(slug)`. These are now **the only sanctioned way** for
  application code to read catalog data — components/pages should call
  these, never import `@/lib/db` directly, per
  TRENDS_PROJECT_CONTEXT.md §4.2 ("database access is isolated").
- Return shapes (`CatalogCategory`, `CatalogProductSummary`,
  `CatalogProductVariant`) are deliberately close to the Phase 2 demo-data
  types so Phase 4 can swap `src/app/page.tsx`'s demo-data imports for
  these functions with minimal changes to the components themselves —
  same intent the demo-data fixtures were built with in Phase 2.
- `CatalogProductSummary.fromPriceToman` is the *lowest* active-variant
  price (for "from ٬XXX تومان" card display); `colorHexes` is the
  deduplicated set of active-variant colors (for swatch dots).
- **Not wired into the homepage yet.** `src/app/page.tsx` still imports
  from `src/domains/catalog/demo-data.ts`. Swapping that over is squarely
  Phase 4 ("Storefront catalog pages") work, not this phase's — see
  CLAUDE_BUILD_INSTRUCTIONS.txt §B.4 ("do not redo completed work or
  jump ahead... finish the current phase... and stop").

**Files changed:**
- New: `src/lib/db/schema/categories.ts`, `products.ts`,
  `product-variants.ts`, `product-images.ts`, `index.ts`,
  `src/lib/db/client.ts`, `src/lib/db/seed.ts`, `drizzle.config.ts`,
  `drizzle/migrations/0000_nice_exodus.sql` + `meta/`,
  `src/domains/catalog/queries.ts`.
- Modified: `package.json` (new deps + `db:generate`/`db:migrate`/
  `db:studio`/`db:seed` scripts), `package-lock.json`,
  `src/components/home/HeroCarousel.tsx` (Phase 2 typecheck fix, see
  above).
- Removed: `.gitkeep` in `src/lib/db/` (now has real files).
- Sandbox-local, not committed: `.env.local` (git-ignored already).

**Database changes:**
- New migration `0000_nice_exodus.sql`: creates `categories`, `products`,
  `product_variants`, `product_images` with all FKs, unique indexes,
  filter indexes, and CHECK constraints described above. Applied and
  verified against a local PostgreSQL 16 instance this session.

**Environment/config changes:**
- `.env.example` already had a `DATABASE_URL` placeholder from Phase 1 —
  unchanged, still accurate.
- No other env vars needed for this phase.

**Tests/checks — all run and passing this session:**
- `npm run typecheck` — clean (0 errors), including all new schema/db/
  query files.
- `npm run lint` — clean (0 errors, 0 warnings — one warning about an
  unnecessary `eslint-disable` comment on `client.ts` was found and
  fixed by removing the now-unneeded comment).
- `npm run build` — clean production build.
- `npx drizzle-kit generate` — generated the migration SQL successfully
  from the schema (4 tables, correct columns/indexes/FKs per its own
  summary output).
- `npx drizzle-kit migrate` — applied cleanly against a real local
  PostgreSQL 16 instance (installed via `apt-get` in this sandbox).
- Verified via `psql \dt` and `\d product_variants` that all four tables,
  their indexes, FKs, and CHECK constraints exist exactly as designed.
- `npm run db:seed` — ran successfully: "Inserted 6 categories." /
  "Inserted 11 products." Verified via direct `psql` `SELECT`s that every
  seeded price matches the demo fixture's Persian-digit price string
  exactly (e.g. `"۵۹۰,۰۰۰ تومان"` → `price_toman = 590000`).
- **Negative tests against the live constraints** (not just "the schema
  looks right" — actually tried to violate it):
  - Attempted to insert a second `(product_id, size, color)` = `(classic-shirt's
    id, "M", "پیش‌فرض")` variant → rejected: `duplicate key value violates
    unique constraint "product_variants_product_size_color_idx"`.
  - Attempted `UPDATE product_variants SET price_toman = -1 ...` → rejected:
    `violates check constraint "product_variants_price_non_negative"`.
  - This confirms the acceptance criterion "Product/variant uniqueness
    constraints exist" and the money-safety rules are enforced by
    PostgreSQL itself, not just assumed from reading the schema file.
- **Data-access-layer smoke test** (temporary script, written, run, and
  deleted — not part of the committed codebase): imported
  `getActiveCategories`, `getFeaturedProducts`, `getNewArrivals`, and
  `getProductBySlug` from `src/domains/catalog/queries.ts` via `tsx` and
  called each one against the seeded database. All returned correct,
  expected data (6 categories in display order; 5 featured products with
  correct `fromPriceToman`; 6 new arrivals with correct `colorHexes`;
  `getProductBySlug("classic-shirt")` returned the right row;
  `getProductBySlug("does-not-exist")` correctly returned `null`). Also
  confirmed the `@/` path alias resolves correctly under plain `tsx`
  (Node 22's native TS/path handling), no extra tooling needed.

**Known limitations:**
- No live PostgreSQL instance ships with this repo — the next
  environment (dev machine, CI, or the next sandbox) needs its own
  Postgres and its own `.env.local`. See "Commands" below for the exact
  setup steps used this session (they're generic, not sandbox-specific).
- Category and variant assignment for the 11 seeded products are Phase-3
  assumptions, not real merchandising data — see seed.ts notes above.
  This is fine for local dev; an admin (Phase 11) or a proper catalog
  import is the real source of truth later.
- No `product_images` rows exist yet — deliberate, see above. Phase 4's
  product cards/detail pages need to keep falling back to `AssetSlot`
  gracefully when `images` is empty (which is already how Phase 2's
  `ProductCard.tsx` behaves, so this should already work without
  changes).
- The `npm audit` moderate-severity findings (dev-only `esbuild` via
  `drizzle-kit`) are unresolved — flagged for Phase 13, not blocking.
- No automated tests exist yet (Phase 14, or sooner for business-critical
  logic). The Phase 3 verification in this session was manual
  (`psql` inspection + a throwaway `tsx` script), which is appropriate for
  a schema/seed phase but is not a substitute for the real integration
  tests Phase 14 will need for cart/checkout/payment logic.

## Architecture Decisions

- **Framework**: Next.js (App Router) + TypeScript + React. Unchanged.
- **Database/ORM**: PostgreSQL + Drizzle ORM, exactly per
  CLAUDE_BUILD_INSTRUCTIONS.txt §A.8, using the `postgres` (porsager)
  driver rather than `node-postgres`/`pg` — Drizzle's own docs recommend
  it for its simpler API and this project has no reason to need `pg`'s
  specific feature set (e.g. LISTEN/NOTIFY isn't needed anywhere in the
  current plan).
- **Modular monolith by domain, database access isolated**:
  `src/lib/db/` owns the Drizzle client/schema/migrations/seed (the "how
  to talk to Postgres" concern); `src/domains/catalog/queries.ts` owns
  the "what catalog data means and how to shape it for callers" concern.
  Components/pages will only ever import from `src/domains/*`, never
  `src/lib/db` directly — enforced by convention/code review for now
  (no lint rule added to police import boundaries yet; worth considering
  in Phase 13 if the domain count grows enough for accidental violations
  to become likely).
- **Variants own price/stock, not products**: see the `products.ts` file
  header. This was a deliberate, non-negotiable choice per
  TRENDS_PROJECT_CONTEXT.md §6, not something arrived at by convenience.
- **Toman as the canonical money unit, stored as a plain integer**: see
  `product-variants.ts`'s header comment for the full reasoning. This is
  a documented assumption (rule A.18) — if a future requirement surfaces
  needing sub-Toman precision (unlikely for Iranian retail, but not
  impossible for some fee/tax calculation), this decision should be
  revisited explicitly rather than silently worked around.
- **`tags` as a Postgres `text[]` instead of a tags/join-table pair**:
  documented simplification in `products.ts`, chosen for "simplest schema
  that fully represents the requirements" (§12) given nothing in the
  current phase plan needs tag reuse, tag renaming, or tag-based
  analytics.
- **Seed script truncates and re-inserts rather than upserting**: correct
  tradeoff for a script whose only purpose is "known-good local dev
  data" — real customer/catalog data will never flow through this path,
  so idempotency-via-upsert complexity isn't worth adding.
- **`tsx` + `dotenv` added as explicit devDependencies** even though
  both are already transitive dependencies of `drizzle-kit`: relying on
  a transitive package's CLI binary/behavior being available and stable
  is fragile across `drizzle-kit` version bumps; declaring them directly
  is more maintainable, matching rule F.6's actual intent (avoid
  *unnecessary* dependencies, not avoid declaring what's actually used).

## Important Assumptions

(Phase 0/1 assumptions carried over unchanged from prior reports.)

- All Phase 2 demo content (names/prices/review counts/copy) remains
  explicitly temporary per TRENDS_PROJECT_CONTEXT.md §2 — Phase 3 only
  moved it into a real database, it did not turn it into "real" catalog
  content.
- The per-product category assignments and per-product variant
  size/color breakdowns used by `seed.ts` are Phase-3 inventions needed
  to satisfy the schema's NOT NULL/uniqueness requirements from data that
  never had that information — see the detailed notes above. Anyone
  relying on these for real merchandising decisions should not.
- Assuming Toman (not Rial) as the canonical stored unit is correct for
  this business — documented in `product-variants.ts` and above. This is
  a business-facing assumption (rule A.18 territory) that should be
  confirmed with whoever owns real pricing/payment decisions before
  Phase 9's payment integration locks it in further.
- Assuming the `postgres` (porsager) driver over `pg`/`node-postgres` is
  an implementation detail, not a business decision, so it didn't need
  sign-off before proceeding (rule F.1: "prefer the simplest
  production-safe solution").

## Known Issues / Technical Debt

(Phase 0/1 items below are unchanged; Phase 2/3 items follow.)

- Vazirmatn not self-hosted yet.
- `eslint-config-next` + `FlatCompat` incompatibility under ESLint 9 —
  don't reintroduce `@eslint/eslintrc`/`FlatCompat` without checking if
  it's still broken upstream.
- No automated tests exist yet (Phase 14, or sooner for business-critical
  logic).
- No CI configuration yet.
- `BenefitsStrip`'s divider rules are a simplified approximation, not a
  pixel-perfect port of the prototype's `nth-child` CSS.
- `npm audit`: 4 moderate-severity findings, all from `drizzle-kit`'s
  bundled dev-only `esbuild` chain (GHSA-67mh-4wv8-2f99). Not a
  production runtime risk (dev tool only); revisit in Phase 13.
- No lint-enforced boundary preventing a future component from importing
  `@/lib/db` directly instead of going through `src/domains/*`
  query functions — currently just convention. Worth a lint rule
  (e.g. `eslint-plugin-boundaries` or a simple `no-restricted-imports`
  rule) once more domains have their own DB-backed query layers.
- Homepage (`src/app/page.tsx`) still reads from
  `src/domains/catalog/demo-data.ts`, not the new database-backed
  `src/domains/catalog/queries.ts` — intentional, that swap is Phase 4's
  job (see "Next Session Instructions").

## Next Session Instructions

- **Exact next objective:** PHASE 4 — Storefront catalog pages, per
  CLAUDE_BUILD_INSTRUCTIONS.txt §D. At minimum:
  1. Set up a local PostgreSQL instance and `.env.local` (see "Commands"
     below), then run `npm run db:migrate && npm run db:seed` to get a
     working local dataset — Phase 3's migration/seed already exist and
     are verified; this is just standing them up in a fresh environment.
  2. Build category listing pages and a product detail page using
     `src/domains/catalog/queries.ts` (already built, verified, and
     ready to consume — `getActiveCategories`, `getFeaturedProducts`,
     `getNewArrivals`, `getProductBySlug`). Add whatever additional
     query functions the catalog pages need (e.g. "products by category
     slug with pagination/sorting/filtering") to that same file, keeping
     the "components never import `@/lib/db` directly" convention.
  3. Decide whether/how to swap `src/app/page.tsx`'s homepage sections
     from `src/domains/catalog/demo-data.ts` over to the real queries —
     the acceptance criteria for Phase 2 was already met using demo
     data, so this is optional polish rather than a blocker, but doing it
     now (since the query layer already exists and matches the demo
     shapes closely) would remove the last of the "known-fake" homepage
     content and is probably worth doing early in the Phase 4 session
     rather than deferring further.
  4. Product/category URLs, breadcrumbs, related products, pagination,
     sorting, filters, loading/empty/error states — full task list in
     CLAUDE_BUILD_INSTRUCTIONS.txt §D Phase 4.
- Files/areas to inspect first: this `PROGRESS.md`, then
  `src/domains/catalog/queries.ts` and `src/lib/db/schema/*` (understand
  the data shapes before building pages against them), then
  `src/components/home/ProductCard.tsx` (Phase 2's existing product-card
  pattern — Phase 4's catalog pages should reuse/extend it rather than
  inventing a second product-card component).
- Do not redo Phase 3's schema/migration/seed work — it's verified and
  complete. Only add new query functions to `src/domains/catalog/queries.ts`
  as new pages need them.

## Commands

- install: `npm install`
- dev: `npm run dev` (or `npx next dev`)
- build: `npm run build` (or `npx next build`)
- start: `npm run start` (after build)
- lint: `npm run lint` (or `npx eslint .`)
- typecheck: `npm run typecheck` (or `npx tsc --noEmit`)
- test: not configured yet (Phase 14, or earlier if business-critical
  logic needs tests sooner)
- db migration (generate): `npm run db:generate` (or
  `npx drizzle-kit generate`) — regenerates SQL from the current schema
  after editing files in `src/lib/db/schema/`.
- db migration (apply): `npm run db:migrate` (or `npx drizzle-kit migrate`)
  — applies pending migrations in `drizzle/migrations/` to `DATABASE_URL`.
- db studio (browse data): `npm run db:studio` (or `npx drizzle-kit studio`)
- seed: `npm run db:seed` (or `npx tsx --env-file=.env.local src/lib/db/seed.ts`)
  — wipes and re-populates the catalog tables from
  `src/domains/catalog/demo-data.ts`.

**Local PostgreSQL setup used this session** (Ubuntu 24.04 sandbox with
`apt-get` access — adjust for whatever environment runs the next
session):
```
apt-get update
apt-get install -y postgresql postgresql-contrib
service postgresql start
su - postgres -c "psql -c \"ALTER USER postgres PASSWORD 'postgres';\""
su - postgres -c "psql -c \"CREATE DATABASE trends;\""
# then in the project root:
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trends"' > .env.local
npm run db:migrate
npm run db:seed
```

Toolchain recorded this session (verified working, network was
available): Node 22.22.2, npm 10.9.7, Next.js 16.3.4, React 19.2.8,
Tailwind CSS 4.3.3, TypeScript per `package.json`'s pinned range,
ESLint 9.39.5 + eslint-config-next 16.3.4, drizzle-orm ^0.45.2,
drizzle-kit ^0.31.10, postgres (porsager driver, latest), tsx 4.23.13,
PostgreSQL server 16.15.
