# Trends Progress Report

## Current Status
- Overall status: Homepage visually rebuilt from the prototype with demo
  data; no database/backend yet. Implementation is done but this
  session's sandbox could not run `npm install`/build/lint/typecheck to
  verify it (see "Known limitations" below) — treat as unverified until
  the next session confirms.
- Current phase: PHASE 2 — Homepage visual migration (COMPLETE WITH
  FOLLOW-UP — code complete, automated checks not run this session)
- Last completed phase: PHASE 1 (verified). PHASE 2 is implemented but
  not yet build-verified.
- Next phase: run checks for PHASE 2 first; if clean, proceed to PHASE 3
  — Database + catalog domain.
- Date: 2026-09-10

## Completed

### Phase 0 — Repository audit + implementation plan
See prior report content preserved below under "Phase 0 findings" —
prototype structure, design tokens, missing assets, and architecture
decisions were audited and are unchanged.

### Phase 1 — Next.js foundation + design system shell
(Unchanged from the previous report — see git history / the version of
this file from the Phase 1 session for the full write-up. Summary: Next.js
App Router + TypeScript + Tailwind v4 foundation, design tokens ported
verbatim from the prototype, Header/Footer shell, Button/Container
primitives, ESLint/typecheck/build all verified passing at the time.)

### Phase 2 — Homepage visual migration
Rebuilt every real homepage section from `reference/prototype.html` as
React components, replacing the Phase 1 placeholder `src/app/page.tsx`.
All sections read from demo/fixture data rather than being hardcoded
inline, so Phase 3 can swap in real catalog queries with minimal
component changes.

**New demo-data fixtures** (`src/domains/*` — first real files in
previously-empty domain folders):
- `src/domains/catalog/demo-data.ts`: categories, featured products, new
  arrivals, promo banners, hero slides, and benefits — all copied
  verbatim from the prototype's hardcoded markup/text (per
  TRENDS_PROJECT_CONTEXT.md §2, this content was always documented as
  seed/demo, not a business requirement).
- `src/domains/cart/demo-data.ts`: two demo cart line items + a total,
  for the cart drawer shell only. Real cart domain logic is Phase 7.

**New UI primitives** (`src/components/ui/`):
- `AssetSlot.tsx`: generic placeholder block for not-yet-supplied
  product/banner/hero imagery, mirroring `.asset-slot` /
  `.asset-slot--banner`. Uses `role="img"` + `aria-label` as a stand-in
  accessible name until real images exist; the `label` prop maps
  directly to a future `next/image` `alt` when Phase 3+ wires up object
  storage/CDN.
- `WishlistButton.tsx` (Client Component): per-product heart toggle,
  local `useState` only (no persistence — Phase 7 replaces with real
  wishlist domain state).
- Added `HeartIcon` to `src/components/ui/icons.tsx` (path copied
  verbatim from the prototype's wishlist SVG).

**New home section components** (`src/components/home/`), each a Server
Component except where noted:
- `HeroCarousel.tsx` (Client Component): full reimplementation of the
  prototype's `#heroCarousel` — autoplay (5s interval, paused on
  hover, disabled entirely under `prefers-reduced-motion`), prev/next
  arrows, clickable dots, and mouse/touch drag-to-swipe with a 15%-width
  release threshold. This was the most complex piece of the phase; it
  replaces ~140 lines of the prototype's inline `<script>` carousel
  logic with real React state/effects (refs for drag tracking to avoid
  stale closures, `IntersectionObserver`-free since it's not
  scroll-based).
- `CategoryNav.tsx`: category circle row, horizontally scrollable on
  mobile (`overflow-x-auto`, hidden scrollbar) and evenly spaced on
  desktop, matching the prototype's own breakpoint behavior. Category
  buttons are inert (no real routes until Phase 4), exactly like the
  prototype.
- `SectionHead.tsx`: shared eyebrow/heading/"view all" pattern used by
  both Featured Products and New Arrivals.
- `ProductCard.tsx` + `FeaturedProducts.tsx`: 5/3/2-column responsive
  product grid with the wishlist toggle and star rating.
- `PromoBanners.tsx`: two pastel banner cards (women/men), stacked on
  mobile and side-by-side on desktop. CTA buttons are inert
  `type="button"` (no href), matching the prototype exactly — these
  aren't real category links yet.
- `NewArrivals.tsx`: 6/3/2-column grid with color swatches per item.
- `BenefitsStrip.tsx`: 4/2/1-column trust strip. Note: the prototype's
  exact per-breakpoint `nth-child` border rules were approximated with
  Tailwind's `divide-*` utilities plus `border-e`/`nth-child(4n)` rather
  than reproduced pixel-for-pixel — a reasonable simplification flagged
  here rather than silently diverging.

**New overlay system** (`src/components/overlays/`):
- `UIOverlayProvider.tsx` (Client Component, React Context): shares
  search-overlay/cart-drawer open state between the header's trigger
  buttons and the overlay/drawer components rendered at the layout root
  — the React equivalent of the prototype's global `openSearch()`/
  `closeCart()` functions that directly mutated the DOM.
- `SearchOverlay.tsx` (Client Component): focuses the input on open,
  closes on Escape or backdrop click. Still a UI shell only — real
  search (URL-driven, database-backed) is Phase 5.
- `CartDrawer.tsx` (Client Component): slide-in panel reading from the
  cart demo-data fixture. **Bug caught and fixed during this session's
  own review:** an initial version toggled the drawer's `hidden`
  attribute and its `translate-x-*` class in the same render, which
  would have made it pop open instantly instead of sliding in (no frame
  existed where it was visible-but-off-screen for the CSS transition to
  animate from). Fixed by keeping the `<aside>` always mounted
  (`aria-hidden` instead of `hidden`, `pointer-events-none` when closed)
  so the transform transition has something to animate.

**Wiring:**
- `src/components/layout/Header.tsx`: cart/search icon buttons now call
  `openCart()`/`openSearch()` from the overlay context instead of doing
  nothing; the cart badge shows the real demo cart item count formatted
  with `toPersianDigits()`. Added scroll-based active-nav-link
  highlighting via `IntersectionObserver` (reimplementing the
  prototype's `window.addEventListener('scroll', ...)` handler) —
  gracefully finds nothing to observe on any future non-homepage route.
- `src/app/layout.tsx`: now wraps `Header` + `{children}` + `Footer` in
  `UIOverlayProvider` and renders `SearchOverlay`/`CartDrawer` at the
  root, alongside the header/footer.
- `src/app/page.tsx`: composes all six real sections in prototype order
  (hero → categories → featured → promo banners → new arrivals →
  benefits), each fed from the demo-data fixtures.
- `src/lib/utils/persian-digits.ts` (new, first real file in
  previously-empty `src/lib/utils/`): `toPersianDigits()` helper used by
  the hero carousel's slide-count ARIA labels and the header's cart
  badge, per TRENDS_PROJECT_CONTEXT.md §5 ("Use Persian digit formatting
  in the UI where appropriate").

**Files changed:**
- New: `src/domains/catalog/demo-data.ts`, `src/domains/cart/demo-data.ts`,
  `src/lib/utils/persian-digits.ts`, `src/components/ui/AssetSlot.tsx`,
  `src/components/ui/WishlistButton.tsx`,
  `src/components/home/HeroCarousel.tsx`,
  `src/components/home/CategoryNav.tsx`,
  `src/components/home/SectionHead.tsx`,
  `src/components/home/ProductCard.tsx`,
  `src/components/home/FeaturedProducts.tsx`,
  `src/components/home/PromoBanners.tsx`,
  `src/components/home/NewArrivals.tsx`,
  `src/components/home/BenefitsStrip.tsx`,
  `src/components/overlays/UIOverlayProvider.tsx`,
  `src/components/overlays/SearchOverlay.tsx`,
  `src/components/overlays/CartDrawer.tsx`
- Modified: `src/components/ui/icons.tsx` (added `HeartIcon`),
  `src/components/layout/Header.tsx` (overlay wiring, active-nav
  highlighting, real cart count), `src/app/layout.tsx` (overlay
  provider + overlays), `src/app/page.tsx` (real sections replacing the
  placeholder)
- Removed: `.gitkeep` in `src/domains/catalog/`, `src/domains/cart/`,
  `src/lib/utils/` (now have real files). All other `src/domains/*` and
  `src/lib/*` folders are still intentionally `.gitkeep`-only.
- Database changes: none (Phase 3).
- Environment/config changes: none this phase.

**Tests/checks — NOT run this session, and this is the important
caveat:**
- This session's sandbox had `node_modules/` completely absent (fresh
  extraction of the handed-off archive) and its network egress fully
  blocked at the host level — every `npm install` attempt failed with
  `403 host_not_allowed` on `registry.npmjs.org`, and a direct `curl`
  check confirmed the same deny reason against other hosts
  (`cdn.jsdelivr.net`) too, i.e. this isn't a package-specific block,
  the sandbox simply has no outbound network access this time. This is
  a harder restriction than Phase 1's session faced (Phase 1 could
  reach npm but not Google Fonts); it is **not** a project decision and
  may well not apply to whichever environment runs the next session —
  Phase 1's own session had working npm access from what its report
  describes.
- Because of that, **`npm run typecheck`, `npm run lint`, `npm run
  build`, and `npm run dev` could not be executed or verified this
  session.** In their place, the following manual verification was
  done instead (documented here so the next session knows exactly what
  has and hasn't been checked):
  - Every new/changed file's braces/parens/brackets were counted
    programmatically and confirmed balanced.
  - A script cross-referenced every `import { X } from "@/..."` in the
    new code against the actual `export`s of the target file — no
    mismatches.
  - Every new/changed `.tsx` file was read in full at least twice by
    hand, checking JSX tag nesting, prop types against the primitives
    they call (`Button`, `Container`, `AssetSlot`), and Tailwind
    arbitrary-value syntax (e.g. `aspect-[21/8]`, `max-[640px]:`,
    `z-[100]`, `duration-[250ms]` — the standard Tailwind scale doesn't
    have `z-90`/`z-100`/`duration-250`, so bracket syntax was used
    throughout instead of the plain numeric utilities that don't
    exist).
  - This manual review caught and fixed one real bug (the `CartDrawer`
    `hidden`-attribute/transition-class conflict described above) before
    handoff — which is exactly the kind of thing an actual `next build`
    + manual click-through would also have caught, so it's a reasonable
    substitute but not a full replacement for one.
- **The next session's very first action should be `npm install && npm
  run typecheck && npm run lint && npm run build && npm run dev`**,
  fixing anything that surfaces, before writing any new code. Until that
  happens this phase's status is COMPLETE WITH FOLLOW-UP, not COMPLETE.

**Known limitations:**
- Automated checks unverified this session — see above. This is the
  main follow-up item.
- Vazirmatn still not self-hosted (carried over from Phase 1 — no font
  files have been supplied yet in any session).
- The `BenefitsStrip` divider rules are a simplified approximation of
  the prototype's exact per-breakpoint `nth-child` CSS, not a
  pixel-for-pixel port (see component note above). Low-risk cosmetic
  difference, worth a look during Phase 13's hardening pass if anyone
  notices it.
- Grid/flex breakpoints throughout the new home components use
  Tailwind's standard `sm`/`md`/`lg` scale (640/768/1024px) to
  approximate the prototype's custom breakpoints (640/860/1024px) —
  same approach Phase 1's `Header` already established for the
  desktop-nav breakpoint, continued here for consistency rather than
  introducing custom breakpoint tokens partway through the project.
- Search overlay and cart drawer are still UI shells with demo content
  (Phase 5 and Phase 7 respectively give them real behavior).
- No real product/category/hero imagery exists yet — everywhere the
  prototype had a `.webp` reference, this phase uses `AssetSlot`
  placeholder blocks with descriptive `aria-label`s instead of broken
  `<img>` tags, per the Phase 2 acceptance criteria.

## Architecture Decisions

(Phase 0/1 decisions below are unchanged; Phase 2 additions follow.)

- **Framework**: Next.js (App Router) + TypeScript + React — no
  deviation. See Phase 1's report for installed versions; this session
  could not re-verify or re-pin versions since `node_modules` doesn't
  exist here (network blocked) — `package.json`/`package-lock.json` were
  not touched this phase.
- **Modular monolith by domain**: `src/domains/catalog` and
  `src/domains/cart` now have their first real files (demo-data
  fixtures). All other domain folders remain `.gitkeep`-only until their
  respective phases.
- **Demo data lives in the domain it belongs to, not inline in
  components**: `src/domains/catalog/demo-data.ts` and
  `src/domains/cart/demo-data.ts`, both explicitly typed (`DemoProduct`,
  `DemoCategory`, `DemoBanner`, `DemoArrival`, `DemoHeroSlide`,
  `DemoBenefit`, `DemoCartItem`) so Phase 3/7 can swap the fixture
  constants for real repository/query functions returning the same
  shapes with minimal changes to the components that consume them.
- **Client/Server component split**: `HeroCarousel`, `WishlistButton`,
  `UIOverlayProvider`, `SearchOverlay`, `CartDrawer`, and `Header`
  (already a Client Component from Phase 1, now also consuming the
  overlay context) are Client Components — each has a genuine
  interactivity requirement (drag/autoplay state, local toggle state,
  shared open/close state, focus management, keyboard handling).
  Everything else added this phase (`CategoryNav`, `SectionHead`,
  `ProductCard`, `FeaturedProducts`, `PromoBanners`, `NewArrivals`,
  `BenefitsStrip`, `AssetSlot`) is a Server Component — no client JS
  ships for them beyond what their client children need.
- **Shared open/close state via React Context, not prop drilling or a
  global store**: `UIOverlayProvider` wraps the whole body in the root
  layout. This was chosen over prop-drilling (the trigger buttons in
  `Header` and the overlay components in `layout.tsx` are siblings, not
  parent/child) and over a heavier state-management library (not
  justified for two booleans + four callbacks — consistent with rule F.6
  "prefer fewer dependencies").
- **Active-nav-link highlighting via `IntersectionObserver`, not a
  scroll event listener**: reimplements the prototype's
  `window.addEventListener('scroll', ...)` behavior with a more modern,
  passive-by-default browser API instead of a literal port of the
  polling-style scroll handler.
- **Hero carousel drag state uses refs for the mutable per-frame values
  (`startX`, `deltaX`, a `draggingRef` boolean) and React state only for
  what actually needs to trigger a re-render** (`currentIndex`,
  `isDragging` for the transition-class toggle, `dragOffsetPercent` for
  the live transform) — avoids stale-closure bugs in the
  mousemove/touchmove handlers without over-using refs for things that
  do need to repaint.

## Important Assumptions

(Phase 0/1 assumptions below are unchanged; Phase 2 additions follow.)

- All Phase 2 demo content (product names/prices/review counts, category
  labels, banner copy, benefit text) is copied verbatim from the
  prototype and is explicitly temporary per TRENDS_PROJECT_CONTEXT.md
  §2 — none of it should be read as a real catalog decision.
- Treating this session's total network blackout (see "Tests/checks"
  above) as an environment condition specific to this sandbox
  invocation, not a permanent project constraint — unlike the Phase 1
  session's font-CDN-specific block, this one prevented `npm install`
  entirely, which is a meaningfully bigger problem for the "run checks
  and fix what you can" rule (A.19). Recording this explicitly so a
  future session doesn't assume the codebase was ever actually compiled
  since Phase 1.
- Assuming the handed-off archive's `package.json`/`package-lock.json`
  from Phase 1 are still the correct dependency set for Phase 2 — no new
  runtime dependencies were needed (no new npm packages were added;
  Phase 2 only uses React/Next built-ins plus the existing Tailwind
  setup).

## Known Issues / Technical Debt

(Phase 0/1 items below are unchanged; Phase 2 additions follow.)

- Vazirmatn not self-hosted yet.
- `eslint-config-next` + `FlatCompat` incompatibility under ESLint 9 —
  don't reintroduce `@eslint/eslintrc`/`FlatCompat` without checking if
  it's still broken upstream.
- No automated tests exist yet (Phase 14, or sooner for business-critical
  logic — none of Phase 2's UI code is business-critical in the sense
  that rule matters for).
- No CI configuration yet.
- **This phase's code has not been run through `next build`/`next dev`
  in any sandbox since it was written** — see "Tests/checks" above. This
  is the most important item on this list; treat Phase 2 as unverified
  until confirmed.
- `BenefitsStrip`'s divider rules are a simplified approximation, not a
  pixel-perfect port of the prototype's `nth-child` CSS (see "Known
  limitations").

## Next Session Instructions

- **Exact next objective, in order:**
  1. Run `npm install && npm run typecheck && npm run lint && npm run
     build && npm run dev` and fix whatever surfaces. Do this before
     writing any new code. Pay particular attention to:
     - `HeroCarousel.tsx` — the most complex new file (drag/autoplay
       state machine); if anything in Phase 2 has a real bug, it's most
       likely here.
     - Tailwind arbitrary-value class strings across the new home/
       overlay components (`aspect-[21/8]`, `max-[640px]:`, `z-[100]`,
       `duration-[250ms]`, `[&:nth-child(4n)]:border-e-0`, etc.) — these
       were written carefully but never run through the actual Tailwind
       v4 JIT compiler this session.
     - The `UIOverlayContext` — confirm `Header`'s buttons actually open/
       close `SearchOverlay`/`CartDrawer` when clicked, and that Escape/
       backdrop-click closing and focus return work as intended.
  2. Do a manual click-through in the browser (or at least a careful
     screenshot comparison against `reference/prototype.html`) covering
     everything in the Phase 2 acceptance criteria: hero carousel drag/
     autoplay/dots, category hover, wishlist heart toggle, search overlay
     open/close, cart drawer open/close (confirm it actually slides in
     now, given the bug fixed this session), mobile/tablet/desktop
     responsive behavior, reduced-motion (disable the carousel autoplay
     and confirm it doesn't spin up).
  3. Once Phase 2 checks are genuinely green, update this file's
     "Current Status"/"Completed" to mark Phase 2 COMPLETE (not COMPLETE
     WITH FOLLOW-UP) and move on to **PHASE 3 — Database + catalog
     domain** per `CLAUDE_BUILD_INSTRUCTIONS.txt` §D: PostgreSQL
     connection, Drizzle setup, initial migrations for categories/
     products/variants/images/attributes, seed data based on the demo
     fixtures already sitting in `src/domains/catalog/demo-data.ts`
     (these were deliberately shaped to make that swap easy), and a data
     access layer.
- **Do not skip straight to Phase 3 without doing step 1 above** — per
  CLAUDE_BUILD_INSTRUCTIONS.txt §A.19 ("do not stop after writing code;
  run checks and fix what you can") and §G ("do not claim a phase is
  complete when checks are failing"), and this phase's checks simply
  haven't been run yet, not "passed."
- Files/areas to inspect first: this `PROGRESS.md`, then
  `src/components/home/HeroCarousel.tsx` and
  `src/components/overlays/*` (highest complexity/risk this phase),
  then the rest of `src/components/home/*` and the demo-data fixtures.

## Commands

- install: `npm install`
- dev: `npm run dev` (or `npx next dev`)
- build: `npm run build` (or `npx next build`)
- start: `npm run start` (after build)
- lint: `npm run lint` (or `npx eslint .`)
- typecheck: `npm run typecheck` (or `npx tsc --noEmit`)
- test: not configured yet (Phase 14, or earlier if business-critical
  logic needs tests sooner — see "Known Issues / Technical Debt")
- db migration: not applicable yet (Phase 3)
- seed: not applicable yet (Phase 3)

Toolchain recorded from the Phase 1 session (last time `npm install`
actually succeeded): Node 22.22.2, npm 10.9.7, Next.js 16.3.4,
React 19.2.8, Tailwind CSS 4.3.3, TypeScript per `package.json`'s pinned
range, ESLint 9.39.5 + eslint-config-next 16.3.4. This session's sandbox
also had Node 22.22.2 / npm 10.9.7 available but zero outbound network
access, so none of the above could be re-verified or re-installed.
