# Trends Progress Report

## Current Status
- Overall status: Storefront browsing (Phase 4) and search/SEO
  foundations (Phase 5) are both implemented **and verified** this
  session — full network access was available, so `npm install`,
  `typecheck`, `lint`, `build`, a local PostgreSQL instance,
  `db:migrate`/`db:seed`, and manual `curl` walkthroughs of every new
  route all actually ran (see the Phase 4 and Phase 5 write-ups below
  for the exact commands/output). Nothing in this report is
  "implemented, unverified."
- Current phase: none in progress — PHASE 5 is COMPLETE.
- Last completed phase: PHASE 5 — Search + SEO foundations
- Next phase: PHASE 6 — Authentication + customer account
- Date: 2026-09-11 (continuation session, same date as the prior
  unverified Phase 4 attempt — this session had network access where the
  immediately preceding one did not)

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

### Phase 4 — Storefront catalog pages (COMPLETE — verified this session)

**Goal:** turn the catalog into a browsable storefront — category
listing pages and product detail pages — on top of Phase 3's query
layer, per CLAUDE_BUILD_INSTRUCTIONS.txt §D Phase 4's task list.

**This session had full network access**, unlike the immediately
preceding session (see the old note below, kept for the record). The
implementation from that prior session was verified as-is with no
changes needed:
- `npm install` — 402 packages, succeeded.
- `npm run typecheck` — clean, no errors.
- `npm run lint` — clean, no errors/warnings.
- Installed PostgreSQL 16 locally (`apt-get install postgresql`),
  created the `trends` database, pointed `.env.local` at it.
- `npm run db:migrate` — applied cleanly.
- `npm run db:seed` — inserted 6 categories, 11 products.
- `npm run build` — clean production build; routes: `/` (static),
  `/category/[slug]` (dynamic), `/product/[slug]` (dynamic).
- Ran `npm run dev` **and** `npm run start` (production mode) and
  `curl`'d real requests against both:
  - `/` — all 6 homepage section IDs present, DB-backed categories/
    featured/new-arrivals render with correct Persian digit-formatted
    prices (e.g. `۵۹۰,۰۰۰ تومان`).
  - `/category/men` — category name/description, sort links
    (`?sort=price-asc`/`price-desc`), size/color filter pill links
    (`?size=M`, `?color=...`) all present with real DB-derived values.
  - `/product/classic-shirt` — title, breadcrumbs, price, variant data
    all present.
  - `/product/does-not-exist` and `/category/does-not-exist` — custom
    not-found UI renders correctly (see "Known Issues" below for one
    caveat on the HTTP status code, which is a Next.js framework
    behavior, not a bug in this code).
  - No hydration warnings/errors in the dev server log for any of the
    above.

**Old environment note, kept for the record (previous session, no
network access):** that session's sandbox had zero network access
(`npm install` returned `403 Forbidden` from `registry.npmjs.org`,
`apt-get update` failed the same way). It implemented Phase 4's code
without being able to run a compiler, linter, or build. This session
confirmed that implementation was correct as written — nothing needed
fixing beyond what's noted in "Known Issues."

### Phase 4 (original implementation notes, still accurate)

**This session's Phase 4 verification (typecheck/lint/build/db/dev/prod
smoke tests, all passing) is written up above.** Everything below this
point in the Phase 4 section is the *original* implementation writeup
from the prior (network-less) session, kept as-is because it's still an
accurate description of what was built and why — only the verification
status has changed, not the code.

**What was implemented:**

*Catalog query layer* (`src/domains/catalog/`):
- `queries.ts` — added `StockState` computation (in-stock / low-stock /
  out-of-stock, aggregated across a product's variants),
  `discountPercent` display math, and rewrote the featured/new-arrivals
  loaders to batch variant/image fetches with `inArray` instead of
  looping one query per product (no functional change to their output
  shape, just avoids N+1 as the catalog grows). Added:
  - `getCategoryBySlug(slug)`
  - `getProductsByCategorySlug({ slug, page, sort, size, color })` —
    category product grid, paginated (12/page), sortable
    (newest/price-asc/price-desc), filterable by one size + one color.
    Filtering/sorting/pagination happen in application code after one
    batched fetch, not in SQL — documented in-file as the right
    tradeoff at today's catalog size (a handful of products/category)
    and explicitly flagged as needing to move server-side once a
    category can hold hundreds+ products.
  - `getProductDetailBySlug(slug)` (replaces the old narrower
    `getProductBySlug`, unused anywhere else so renaming was safe) —
    full detail including description/brand/tags/all active variants.
  - `getRelatedProducts(categorySlug, excludeProductId, limit)`.
- `presentation.ts` (new file) — `ProductSort` type,
  `PRODUCT_SORT_OPTIONS`, `isProductSort`, `buildCategoryHref` (builds
  clean, shareable `/category/[slug]?...` URLs, omitting params at
  their default value), and `swatchForCategorySlug` (UI-only pastel
  swatch-per-category mapping — deliberately *not* a DB column, see
  in-file comment). **This file exists specifically so client
  components never import `queries.ts`** — `queries.ts` pulls in the
  Drizzle/`postgres` client at module-eval time, which must never be
  bundled for the browser. Verified via `grep` that every
  `"use client"` component's only import from `queries.ts` (if any) is
  `import type`.

*New routes:*
- `/category/[slug]` (`page.tsx` + `loading.tsx`) — breadcrumbs, H1 +
  category description, sort links, size/color filter pills, product
  grid, pagination, and a "showing X of Y" count. All sort/filter/page
  controls are plain server-rendered `<Link>`s reading/writing URL
  search params — no client JS/hooks anywhere on this page, so it works
  before hydration and is fully shareable/bookmarkable.
  `generateMetadata` and the page body share one DB fetch via
  `React.cache()` (keyed on primitive args, not the raw Next.js
  `props` object, since `cache()` compares by reference/value per arg).
  Unknown category slug → `notFound()`.
- `/product/[slug]` (`page.tsx` + `loading.tsx`) — breadcrumbs, image
  gallery (client component: thumbnail switching; falls back to a
  single `AssetSlot` placeholder since no real product images exist
  yet), variant picker (client component: size/color selection with
  live price/discount/stock; correctly falls back to the nearest valid
  combination if a size+color pairing doesn't exist as a variant —
  *not* currently exercised by the seed data, which only ever gives one
  size per product, but written generically for when Phase 11 adds
  real size runs), description/tags, and a related-products rail (same
  category, excludes itself). Same `React.cache()` fetch-sharing
  pattern. **No "add to cart" button** — cart mutations are Phase 7/8;
  a button that didn't actually add anything to a real cart would be a
  fake action per rule G, so the picker is display-only until Phase 7.
- `src/app/not-found.tsx` (new) — custom Persian 404 page; Next's
  default is generic/English.

*Shared catalog components* (`src/components/catalog/`, all new):
`Breadcrumbs`, `ProductCard` (real-data version, supersedes Phase 2's
`components/home/ProductCard.tsx`, which was deleted), `ProductGrid`
(+ empty state), `StockBadge`, `DiscountBadge`, `SortSelect`,
`CategoryFilters`, `Pagination` (all five of these are plain Server
Components using `next/link` — no client JS needed for sort/filter/page
navigation), `ProductGallery` (client), `VariantSelector` (client).

*Homepage/nav wired to real data:*
- `src/app/page.tsx` — categories/featured-products/new-arrivals now
  come from `getActiveCategories`/`getFeaturedProducts`/
  `getNewArrivals` instead of `demo-data.ts`. Hero slides, promo
  banners, and the benefits strip **intentionally stay on demo data** —
  those are homepage promotional content (Phase 11 admin scope), not
  catalog data, so swapping them is out of this phase.
- `src/components/home/CategoryNav.tsx`, `FeaturedProducts.tsx`,
  `NewArrivals.tsx` — rewritten to accept the real `Catalog*` types and
  link to `/category/[slug]` / `/product/[slug]` instead of being inert.
- `src/components/layout/Header.tsx` — "مردان"/"زنان"/"اکسسوری‌ها" now
  link to their real `/category/[slug]` routes instead of the
  homepage's `#categories` anchor; "صفحه اصلی" now links to `/` instead
  of `#hero` so it works as an actual home link from category/product
  pages. "فروشگاه" stays on `#featured` — there's no all-categories
  catalog page in scope yet. Desktop/mobile nav render real routes via
  `next/link` and hash-anchors via plain `<a>`.

**New utility added:** `src/lib/utils/money.ts` — `formatToman` (Persian
digit price formatting, e.g. `590000` → `"۵۹۰,۰۰۰ تومان"`) and
`discountPercent` (rounded % off, `0` when there's nothing to show).

**Files changed:**
- New: `src/domains/catalog/presentation.ts`, `src/lib/utils/money.ts`,
  `src/app/category/[slug]/page.tsx` + `loading.tsx`,
  `src/app/product/[slug]/page.tsx` + `loading.tsx`,
  `src/app/not-found.tsx`, `src/components/catalog/*` (10 files listed
  above).
- Rewritten: `src/domains/catalog/queries.ts`, `src/app/page.tsx`,
  `src/components/home/CategoryNav.tsx`,
  `src/components/home/FeaturedProducts.tsx`,
  `src/components/home/NewArrivals.tsx`,
  `src/components/layout/Header.tsx`.
- Deleted: `src/components/home/ProductCard.tsx` (superseded by
  `src/components/catalog/ProductCard.tsx`, which is used both on the
  homepage and in category/related-product grids).
- No schema/migration changes — Phase 3's schema is untouched, per
  "do not redo completed work."

**Database changes:** none.

**Environment/config changes:** none.

**Tests/checks — NONE ran this session (see environment note above).**
**Superseded: all of the below was actually run in the following
session (this file's Phase 4 section above, "COMPLETE — verified this
session") and passed. Kept here only as a historical record of what the
original implementing session expected/flagged as risky.**
Specifically still outstanding, in priority order for whoever picks
this up next:
1. `npm install` — first time this will have actually been attempted
   since the code changes above. **Expect to actually need this to
   succeed before anything else is possible.**
2. `npm run typecheck` — highest-risk unverified area: Drizzle's
   inferred row types for the new batched `inArray` queries in
   `queries.ts` (`VARIANT_COLUMNS`/`IMAGE_COLUMNS` partial-select
   objects, the `groupByProductId` generic, `RawVariantRow` structural
   compatibility with the wider selected-row type). I'm fairly
   confident in this by manual reading but it is exactly the kind of
   thing `tsc` catches that a human reviewer misses.
3. `npm run lint` — unverified; watch for unused-import warnings (I
   removed several old demo-driven imports by hand) and the
   `react-hooks`/`next/core-web-vitals` rules on the two new client
   components (`ProductGallery`, `VariantSelector`).
4. `npm run build` — unverified; the two dynamic routes
   (`/category/[slug]`, `/product/[slug]`) will need a reachable
   `DATABASE_URL` at build time if Next tries to statically analyze
   them (they're fully dynamic — no `generateStaticParams` was added,
   intentionally, since the catalog is small but not fixed — this
   should be fine, but hasn't been confirmed against a real build).
5. Then, an actual local Postgres + `npm run db:migrate && npm run
   db:seed` + `npm run dev`, and manually click through: homepage →
   category page (try sort links, size/color filters, pagination if a
   category has enough products) → product page → related products →
   an unknown slug (confirm the custom 404 renders) → mobile nav links.

**Known limitations (in addition to "unverified", above):**
- Category browsing's filter/sort/pagination is done in JS after one
  batched fetch per category, not in SQL — fine at today's scale (~11
  products total across 6 categories), explicitly flagged in
  `queries.ts` as needing a rewrite once any category's product count
  grows into the hundreds.
- Related products are "same category, most recent, excluding self" —
  no actual relevance/similarity logic. Reasonable default per rule
  F.1; revisit if merchandising ever wants curated/algorithmic related
  products.
- Size/color filters are single-select (one size, one color at a time),
  not multi-select — documented in `CategoryFilters.tsx` as the right
  tradeoff for today's small catalog.
- No product images exist (Phase 3 seeded zero `product_images` rows),
  so every gallery/card renders through the `AssetSlot` placeholder
  path. The real-`next/image` code paths in `ProductGallery`,
  `ProductCard`, and `NewArrivals` are written and ready but literally
  untested against a real image, since none exists in this dataset.



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
- **(Phase 4) `presentation.ts` split from `queries.ts`**: any catalog
  constant/helper a client component might need (sort labels, URL
  builders, category swatch colors) lives in a DB-free module so
  Next.js never has a reason to try bundling the Postgres driver for
  the browser. `queries.ts` is exclusively for Server Component /
  future route-handler consumption.
- **(Phase 4) Category filter/sort/pagination in application code, not
  SQL**: see `getProductsByCategorySlug`'s doc comment in `queries.ts`.
  Correct for the current catalog size; flagged as needing to move
  server-side once category sizes grow substantially.
- **(Phase 4) No "add to cart" UI on the product page yet**: cart
  mutations are Phase 7 (and checkout is Phase 8). Rule G ("do not use
  placeholder TODOs as a substitute for required functionality") reads
  most safely here as "don't render a button that doesn't actually do
  the thing it claims to" — so the variant picker is display-only
  (price/stock for the selected combination) until real cart state
  exists to wire it into.
- **(Phase 4) UI-only category swatch colors, not a DB column**: see
  `presentation.ts`'s `swatchForCategorySlug` doc comment — a category
  circle's pastel color is presentation styling an operator wouldn't
  need to manage via admin CRUD (Phase 11), so it isn't schema.

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
- **(Phase 4) The prior session's assumption that its total lack of
  network access was a sandbox anomaly, not the new normal, was
  confirmed correct** — this session had full `npm`/`apt-get` access
  and used it to verify everything end-to-end (see the Phase 4 write-up
  above). No further action needed on this point.
- **(Phase 5) Assuming `priceCurrency: "IRR"` alongside a raw Toman
  integer in the `Product` JSON-LD's `Offer` blocks is an acceptable
  first-pass simplification, not a silent currency-conversion bug** —
  documented in-file and in "Known Issues" below. This is a
  business/legal-adjacent judgment call (structured data feeding into
  Google Shopping/rich results) that should be revisited with whoever
  owns pricing/payment decisions, likely alongside Phase 9's payment
  integration.

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
- Homepage (`src/app/page.tsx`) now reads categories/featured
  products/new arrivals from `src/domains/catalog/queries.ts` (swapped
  in Phase 4). Hero slides, promo banners, and the benefits strip
  intentionally stay on `demo-data.ts` fixtures — those are homepage
  promotional content (Phase 11's admin scope: "hero slides",
  "homepage promotional content"), not catalog data.

**(Phase 4, verified this session):**
- Category listing's filter/sort/pagination is JS-side after one
  per-category fetch, not SQL — fine now, needs revisiting at scale
  (flagged in `queries.ts`). Search (Phase 5) uses the same pattern for
  the same reason.
- Single-select size/color filters (not multi-select) — documented
  tradeoff in `CategoryFilters.tsx`.
- No product images exist in the seed data, so the real-image code
  paths in `ProductGallery`/`ProductCard`/`NewArrivals` have never
  actually rendered a real `next/image` — only the `AssetSlot`
  fallback path has any real-world exercise.
- Related products are recency-only, no similarity/relevance logic.
- **`notFound()` returns HTTP 200, not 404, on `/category/[slug]` and
  `/product/[slug]`** — confirmed in both `next dev` and `next start`
  (production) this session via `curl -D -`. This is a documented
  upstream Next.js behavior, not a bug in this codebase: both routes
  have a `loading.tsx` for streaming UX, and Next.js's own docs
  (`not-found.js` reference page) state plainly that it "will return a
  200 HTTP status code for streamed responses, and 404 for
  non-streamed responses." Multiple long-standing upstream GitHub
  issues (e.g. vercel/next.js#76474, #93239) confirm this is still
  unresolved as of Next.js 16.3.4. The only framework-level fix is
  removing `loading.tsx` from the segment, which would kill the
  streaming UX both pages currently have — not a trade worth making
  silently. Left as-is; flagged here for a deliberate decision (accept
  the 200, or add an existence-check workaround) rather than a change
  made without discussion. Low real-world impact since Google/Bing
  both primarily key off the rendered "not found" content and
  `noindex`/canonical signals rather than status code alone, but it's
  worth knowing about for anyone auditing crawler behavior.

**(Phase 5, this session):**
- Search is a single `ILIKE` across `title`/`short_description`/
  `brand` — no ranking/relevance beyond newest/price sort, no
  fuzzy/typo tolerance, no `tags` array search (Postgres `text[]`
  `ILIKE` isn't straightforward; would need `array_to_string` or a
  `tsvector` — skipped for this phase's scope per "sensible PostgreSQL
  search first," not full-text search yet). Revisit if search quality
  becomes a real complaint — likely a `tsvector`/`GIN` index step
  before reaching for an external search service.
- Category pages' Open Graph metadata has no image (categories have no
  associated image column/asset yet) — only `url` is set. Product
  pages do get an OG image from the product's first `product_images`
  row, but since no seed product has images yet (see the pre-existing
  "no product images exist in the seed data" item above), this is
  unverified against a real image end-to-end.
- No `ItemList`/`BreadcrumbList` JSON-LD on category pages — only
  `Product` JSON-LD on product detail pages. Category-level structured
  data is a reasonable future addition, not called out explicitly in
  TRENDS_PROJECT_CONTEXT.md §8's list, so left out for scope control.
- Product JSON-LD's `Offer.priceCurrency` is set to `"IRR"` (schema.org
  requires an ISO 4217 code; there's no code for Toman) while
  `Offer.price` is the raw Toman integer shown on the page — **this is
  a deliberate, documented mismatch** (see the comment in
  `src/app/product/[slug]/page.tsx`), not a conversion bug. A fully
  correct fix would multiply by 10 to get Rial, but that would make the
  structured-data price silently diverge from the visible on-page
  price, which seems worse for a first pass. Flagged for a deliberate
  decision later (Phase 9/13?) rather than picked unilaterally.
- No `/admin` or `/account` routes exist yet, so `robots.ts` has
  nothing to `Disallow` today — the file has a comment flagging that it
  needs revisiting once Phase 6 (`/account/*`) and Phase 11
  (`/admin/*`) exist.

### Phase 5 — Search + SEO foundations (COMPLETE)

**Goal:** real product search, URL-driven search state, and SEO
foundations (canonical URLs, Open Graph, sitemap, robots, structured
data, noindex for near-duplicate/private pages) per
CLAUDE_BUILD_INSTRUCTIONS.txt §D Phase 5.

**New/changed files:**
- `src/domains/catalog/queries.ts` — added `searchProducts({ q, sort,
  page })`: plain PostgreSQL `ILIKE` over `title`/`short_description`/
  `brand` (not Elasticsearch/Meilisearch — TRENDS_PROJECT_CONTEXT.md §5
  explicitly says not to reach for those until scale requires it), same
  batched `inArray` variant/image fetch + JS-side sort/paginate pattern
  as `getProductsByCategorySlug`. Also added `getSitemapEntries()` —
  lightweight slug + `updatedAt` for every active category/product, for
  `sitemap.ts`. Also extended `getProductDetailBySlug` to select
  `seoTitle`/`seoDescription` (existing DB columns that nothing was
  reading before) and added them to `CatalogProductDetail`.
- `src/domains/catalog/presentation.ts` — added `SearchQueryState` +
  `buildSearchHref()`, the same "omit defaults, shareable URL" pattern
  as `CategoryQueryState`/`buildCategoryHref`, keyed on the query string
  instead of a category slug.
- `src/app/search/page.tsx` (new) — URL-driven `/search?q=&sort=&page=`
  page. Empty `q` shows a prompt instead of querying. `generateMetadata`
  sets `robots: { index: false, follow: true }` — search results are
  near-duplicate content that shifts with every query string.
- `src/components/catalog/SearchSortSelect.tsx` /
  `SearchPagination.tsx` (new) — same plain-link, zero-client-JS pattern
  as `SortSelect`/`Pagination`, just keyed on `SearchQueryState`/
  `buildSearchHref` instead of category state.
- `src/components/overlays/SearchOverlay.tsx` — the input is now inside
  a real `<form action="/search" method="get">` (`name="q"`, closes the
  overlay `onSubmit`). No client-side fetch/state added — the `/search`
  page itself is what's database-backed; the overlay is just a plain
  GET form, works even without JS.
- `src/lib/site-config.ts` (new) — `SITE_URL` (from
  `NEXT_PUBLIC_SITE_URL`, falls back to `http://localhost:3000`) and
  `SITE_NAME`, a single source of truth for `metadataBase`/canonical/
  OG/sitemap/robots instead of repeating the env var lookup everywhere.
- `src/app/layout.tsx` — added `metadataBase: new URL(SITE_URL)`
  (required for Next.js to resolve relative OG image URLs) and a
  default `openGraph` block (`siteName`, `locale: "fa_IR"`, `type:
  "website"`).
- `src/app/page.tsx` — added `alternates: { canonical: "/" }` +
  `openGraph: { url: "/" }`.
- `src/app/category/[slug]/page.tsx` — `generateMetadata` now sets
  `alternates.canonical` to the *clean* `/category/[slug]` URL
  (regardless of the current filter/sort/page state) and `openGraph.url`
  to match, plus `robots: { index: false, follow: true }` whenever a
  size/color filter or page > 1 is present — faceted URLs are
  near-duplicate content, same reasoning as the search page.
- `src/app/product/[slug]/page.tsx` — `generateMetadata` now uses
  `product.seoTitle`/`seoDescription` when set (falling back to
  `title`/`shortDescription`), sets `alternates.canonical` +
  `openGraph` (with the first product image, if any). The page body now
  also renders a `<script type="application/ld+json">` with a
  schema.org `Product` block (name, description, brand, image URLs,
  canonical URL, one `Offer` per variant with price/availability/SKU).
- `src/app/sitemap.ts` (new) — `MetadataRoute.Sitemap` built from
  `getSitemapEntries()`: homepage (priority 1) + every active category
  (priority 0.8) + every active product (priority 0.7, `lastModified`
  from `updatedAt`).
- `src/app/robots.ts` (new) — `allow: "/"` for all user agents (no
  `/admin`/`/account` routes exist yet to disallow — comment in-file
  flags revisiting once Phase 6/11 add them) + a `sitemap` pointer.

**Tests/checks — all run this session, all passing:**
- `npm run typecheck` — clean.
- `npm run lint` — clean (one warning surfaced and fixed: a leftover
  `eslint-disable-next-line react/no-danger` comment was flagged as
  unused since that rule isn't in this project's ESLint config; removed
  it rather than adding an unnecessary rule just to justify the
  comment).
- `npm run build` — clean; new routes appear correctly as static
  (`/robots.txt`, `/sitemap.xml`) or dynamic (`/search`).
- Manual `curl` verification against a running `next dev` server (with
  local PostgreSQL up and seeded):
  - `/search` (no `q`) → prompt shown, no query executed.
  - `/search?q=هودی` → 2 real DB results ("هودی", "هودی روزانه"),
    `<title>جستجو: هودی | ترندز</title>`, sort links
    (`?sort=price-asc`/`price-desc`) present and correctly
    URL-encoded/`&amp;`-escaped.
  - `/search?q=zzzznotfound` → empty-state message renders, HTTP 200
    (not an error).
  - `<meta name="robots" content="noindex, follow"/>` confirmed present
    on `/search?q=...` via the raw RSC/HTML payload.
  - `/robots.txt` → `User-Agent: *` / `Allow: /` / `Sitemap:` line, all
    correct.
  - `/sitemap.xml` → valid XML (parsed with `python3 -m
    xml.dom.minidom`), exactly 18 `<loc>` entries = 1 homepage + 6
    categories + 11 products, matching the seed data counts.
  - `/` → `<link rel="canonical" href=".../">`, `og:title`/
    `og:description`/`og:url` all present.
  - `/category/men` (no filters) → canonical present, **no** `robots`
    meta tag (correctly indexable).
  - `/category/men?size=M` (filtered) → canonical points to the *clean*
    `/category/men` URL, `<meta name="robots" content="noindex,
    follow"/>` present.
  - `/product/classic-shirt` → canonical, `og:title`/`og:description`/
    `og:url`/`og:type`, and a `<script type="application/ld+json">`
    block containing `"@type":"Product"` and one `"@type":"Offer"` per
    variant, all confirmed present.

**Known limitations / follow-ups:** see "Known Issues / Technical Debt"
below (search relevance/full-text, category OG images, `Product`
JSON-LD's Toman-under-`IRR` currency-code mismatch, no admin/account
routes yet to disallow).

## Next Session Instructions

- **Exact next objective: PHASE 6 — Authentication + customer
  account**, per CLAUDE_BUILD_INSTRUCTIONS.txt §D. Phases 4 and 5 are
  both verified COMPLETE (see above) — start fresh on auth, don't redo
  catalog/search/SEO work.
  1. Read CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 6 task list and
     TRENDS_PROJECT_CONTEXT.md §3 "Authentication" and §12 "Data model
     direction" (users/accounts/sessions/verification tokens) before
     writing any code.
  2. Choose a mature auth library rather than hand-rolling
     sessions/password hashing (rule F.2). Whatever is chosen must
     satisfy every constraint already spelled out in
     TRENDS_PROJECT_CONTEXT.md §3: Iranian mobile number support,
     optional email, OTP-ready architecture (even if no real SMS
     provider is wired up yet — Phase 6 just needs the abstraction to
     exist), role-based authorization for staff/admin, and — this is a
     hard rule, not a preference — **no auth tokens in `localStorage`**
     (rule A.12 / G).
  3. New schema needed: `users`, session storage (however the chosen
     auth library wants it — table or otherwise), `roles`/permissions
     if the library doesn't already give you something reasonable, and
     an `addresses` table (per §12) even though checkout doesn't exist
     until Phase 8 — an address book is part of "account profile" in
     this phase's own task list.
  4. Iranian mobile normalization: decide on and document the canonical
     stored format (e.g. `+98XXXXXXXXXX`) in the new schema file's
     header comment, the same way `product-variants.ts` documents its
     money-unit choice — don't leave the format implicit.
  5. Build: registration, login, logout, session handling, password
     reset/recovery (if password auth is the chosen method), protected
     `/account` routes with real server-side ownership checks (not just
     hidden UI), and an account profile/address book page.
  6. Wire the header's existing "حساب کاربری" (account) button — it's
     currently a plain icon button with an `aria-label`, not a link —
     into whatever the real login/account entry point ends up being.
  7. Run `typecheck`/`lint`/`build` and manually verify: register → log
     in → see account page → log out → confirm a protected route
     redirects/blocks when logged out → confirm one user cannot view
     another user's account data by guessing an ID/slug in the URL.
  8. Update `PROGRESS.md` the same way this session did: mark Phase 6
     COMPLETE (or COMPLETE WITH FOLLOW-UP/BLOCKED, per rule B) with a
     real list of what was implemented, checks run, and what's next.
- Files/areas to inspect first: `src/lib/db/schema/` (to see the
  existing schema-file conventions before adding `users.ts`/etc.),
  `src/domains/catalog/queries.ts` (the "domain owns its own DB access,
  page/component code only calls exported functions" pattern to follow
  for a new `src/domains/auth/` or `src/domains/customers/` module),
  and `src/components/layout/Header.tsx` (the account button that needs
  wiring up).
- Do not redo Phase 3/4/5 work. Do not start Phase 7 (cart/wishlist)
  before Phase 6 — cart's guest-to-user merge and wishlist's
  authenticated persistence both depend on real auth existing first.

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

Toolchain recorded in the Phase 3 session (verified working, network was
available then): Node 22.22.2, npm 10.9.7, Next.js 16.3.4, React 19.2.8,
Tailwind CSS 4.3.3, TypeScript per `package.json`'s pinned range,
ESLint 9.39.5 + eslint-config-next 16.3.4, drizzle-orm ^0.45.2,
drizzle-kit ^0.31.10, postgres (porsager driver, latest), tsx 4.23.13,
PostgreSQL server 16.15.

**This session (Phase 4) had zero network access** — `node`/`npm`
binaries were present (same versions as above) but every registry/apt
request returned `403 Forbidden` / `x-deny-reason: host_not_allowed`.
No install, no local Postgres, no toolchain versions to newly record.
The version list above is carried over from the last session that
actually had network access, for reference only — confirm it's still
accurate once `npm install` succeeds again.
