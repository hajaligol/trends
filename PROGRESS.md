# Trends Progress Report

## Current Status
- Overall status: Foundation shell running; no database/backend yet.
- Current phase: PHASE 1 — Next.js foundation + design system shell (COMPLETE)
- Last completed phase: PHASE 1
- Next phase: PHASE 2 — Homepage visual migration
- Date: 2026-09-09

## Completed

### Phase 0 — Repository audit + implementation plan
See prior report content preserved below under "Phase 0 findings" — prototype
structure, design tokens, missing assets, and architecture decisions were
audited and are unchanged.

### Phase 1 — Next.js foundation + design system shell
- Initialized a real Next.js application in place of the empty skeleton:
  App Router, TypeScript, React 19, Next.js 16 (Turbopack).
- Installed and configured Tailwind CSS v4 using its CSS-first `@theme`
  approach (no `tailwind.config.js` needed in v4) instead of a JS config
  file.
- Ported every design token from `reference/prototype.html`'s `:root` block
  verbatim into `src/styles/globals.css` (`@theme` block): all 14 named
  colors, the 4 radii, `--font-base`, `--max-width` (1240px), and the fluid
  `--gutter` (`clamp(20px, 4.5vw, 55px)`). Tailwind v4 auto-generates
  utilities from these (`bg-ink`, `text-text-secondary`, `bg-hero-beige`,
  etc.), so component code uses those instead of re-declaring colors.
- Added `prefers-reduced-motion` handling and `:focus-visible` styling at
  the global CSS level (ported from the prototype), ahead of Phase 2's
  interactive components needing it.
- Built the root layout (`src/app/layout.tsx`) with `<html lang="fa"
  dir="rtl">`, importing the global stylesheet, and composing `Header` +
  `{children}` + `Footer` — RTL is applied at the document root, not
  patched on afterward.
- Built `Header` (`src/components/layout/Header.tsx`) as a small Client
  Component (`"use client"`) — the only interactivity in it is the
  mobile-nav open/close toggle, which genuinely requires client state. It
  reproduces the prototype's `.site-header` structure: logo, desktop
  `main-nav` links, cart/account/search icon buttons (cart badge shown,
  not yet wired to real cart state — that's Phase 7), and the hamburger
  toggle + mobile drawer. Icon SVGs were copied path-for-path from the
  prototype into `src/components/ui/icons.tsx` (`CartIcon`, `AccountIcon`,
  `SearchIcon`) so they render identically.
- Built `Footer` (`src/components/layout/Footer.tsx`) as a Server
  Component: newsletter section, social icon placeholders, footer link
  columns, bottom bar with the Persian-calendar copyright line — all
  presentational only in this phase (no submit handler; real persistence
  is Phase 12 per project context §6 "Newsletter").
- Added `Button` / `ButtonLink` (primary pill + ghost variants, matching
  `.btn-primary` / `.btn-ghost`) and `Container` (matches `.container`) as
  the first reusable UI primitives under `src/components/ui/`.
- Added a placeholder `HomePage` (`src/app/page.tsx`) with the same section
  anchors the header nav points at (`#hero`, `#categories`, `#featured`,
  `#collections`) so navigation doesn't 404, each holding a short
  "built in Phase 2" notice instead of real content — this phase's job was
  the shell, not the homepage sections.
- Configured ESLint 9 using `eslint-config-next`'s native flat-config
  export directly (`import nextConfig from "eslint-config-next"`).
  **Note for future sessions:** the more commonly-documented pattern of
  wrapping `next/core-web-vitals` in `@eslint/eslintrc`'s `FlatCompat` broke
  here with `TypeError: Converting circular structure to JSON` (ESLint 9 +
  a circular `eslint-plugin-react` config reference). Importing
  `eslint-config-next`'s already-flat array directly avoided the bug
  entirely and is simpler; `@eslint/eslintrc` was removed again.
- Added `next.config.ts` (typed config, empty `images.remotePatterns` for
  now — Phase 3+ will add object-storage/CDN hosts), `.env.example`
  (documents every env var later phases will need: `DATABASE_URL`,
  `AUTH_SECRET`, storage keys, `PAYMENT_PROVIDER`/`PAYMENT_MERCHANT_ID` left
  blank per rule A.17, SMS/OTP key, `NEXT_PUBLIC_SITE_URL`), and
  `.gitignore` (excludes `node_modules`, `.next`, all `.env*` except
  `.env.example`, build artifacts).
- Removed the `.gitkeep` placeholders in folders that now have real files
  (`src/app`, `src/components/*`, `src/styles`). Left `.gitkeep` in place
  everywhere still intentionally empty (`src/domains/*`, `src/lib/*`,
  `public/assets/*`, `drizzle/migrations`, `tests/*`) — those are Phase 3+
  territory and were not touched.

- Files changed (all new, nothing pre-existing deleted or altered other
  than removing now-redundant `.gitkeep`s):
  - `package.json`, `package-lock.json`
  - `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`,
    `eslint.config.mjs`, `next-env.d.ts` (generated)
  - `.env.example`, `.gitignore`
  - `src/styles/globals.css`
  - `src/app/layout.tsx`, `src/app/page.tsx`
  - `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`
  - `src/components/ui/Button.tsx`, `src/components/ui/Container.tsx`,
    `src/components/ui/icons.tsx`
  - Removed: `src/.gitkeep`, `src/app/.gitkeep`,
    `src/components/.gitkeep`, `src/components/layout/.gitkeep`,
    `src/components/ui/.gitkeep`, `src/styles/.gitkeep`

- Database changes: none (Phase 3).
- Environment/config changes: `.env.example` added; no real `.env.local`
  created or committed (none needed yet — nothing reads env vars in this
  phase).
- Tests/checks run this session, all passing:
  - `npx tsc --noEmit` → clean, no errors.
  - `npx eslint .` → clean, exit code 0, no warnings.
  - `npx next build` → compiles successfully, static homepage
    (`/`, `/_not-found`) prerendered, no build errors.
  - `npx next dev` smoke test → `GET /` returns HTTP 200; response HTML
    confirmed to contain `dir="rtl"`, `lang="fa"`, and rendered Persian
    text (`ترندز`, headings, nav labels); dev server log had zero
    error/warning lines.
- Known limitations:
  - **Vazirmatn is still not self-hosted.** No `.woff2` files were
    supplied anywhere in the inputs, and this sandboxed environment's
    network egress does not reach Google Fonts (`fonts.gstatic.com` /
    `fonts.googleapis.com` are not on the allowed-domains list), so
    `next/font/google` could not be used. `--font-base` currently falls
    back to the same `Tahoma, "Segoe UI", Arial, sans-serif` stack the
    prototype itself ships with — this is not a regression versus the
    prototype, but it is not the intended final typography. **Action for
    whoever has real font files:** drop `Vazirmatn-*.woff2` into
    `public/fonts/`, switch to `next/font/local` (or a manual
    `@font-face` in `globals.css`) in a small dedicated commit, and update
    `--font-base`. No other code needs to change.
  - Header/account/search/cart icon buttons render but are not
    functionally wired yet (no search overlay, no cart drawer, no auth) —
    correct for this phase; that wiring is explicitly Phase 2 (overlay/
    drawer UI shells) and later phases (real behavior).
  - Cart badge shows a static `۰` placeholder, not real cart state
    (Phase 7).
  - Homepage is a placeholder, not the real migrated sections (Phase 2).
  - This working environment's filesystem is still ephemeral between
    sessions (same constraint noted in the Phase 0 report). The full
    working app (including `node_modules`-excluded source) has been
    packaged as a downloadable archive for the next session to continue
    from. If a persistent repo/working directory becomes available, that
    should replace this hand-off method.

## Architecture Decisions

(Phase 0 decisions below are unchanged; Phase 1 additions follow.)

- **Framework**: Next.js (App Router) + TypeScript + React — no deviation.
  Installed versions: Next.js 16.3.4, React 19.2.8 (see "Commands" below
  for exact reproduction).
- **Modular monolith by domain**: `src/domains/<n>` per business boundary —
  still all empty (`.gitkeep` only); first real domain code lands in
  Phase 3 (catalog).
- **Styling**: Tailwind CSS v4's CSS-first configuration
  (`@import "tailwindcss";` + `@theme { ... }` in `globals.css`) rather
  than a `tailwind.config.js`/`.ts` file — this is the framework's current
  recommended approach and keeps all design tokens in one file instead of
  splitting them across a JS config and CSS. Utilities are generated
  automatically from the `--color-*` custom properties (e.g. `--color-ink`
  → `bg-ink`/`text-ink`/`border-ink`).
- **ESLint**: flat config (`eslint.config.mjs`) importing
  `eslint-config-next`'s default export directly, not through
  `FlatCompat`. See the Phase 1 completed-work note above for why.
- **Client/Server component split**: `Header` is a Client Component
  (mobile-nav toggle state); `Footer`, `RootLayout`, `HomePage`, and all
  `src/components/ui/*` primitives are Server Components. This is the
  narrowest client boundary that satisfies the actual interactivity need
  in this phase, per rule E "Client components: default to Server
  Components."
- **Homepage anchors preserved**: kept the prototype's `#hero
  #categories #featured #collections` in-page anchor IDs on the Phase 1
  placeholder sections specifically so the header nav (built this phase)
  has real, working targets today and doesn't need to change again when
  Phase 2 fills those sections in.

## Important Assumptions

(Phase 0 assumptions below are unchanged; Phase 1 additions follow.)

- The supplied prototype is the full and final visual reference.
- Missing `.webp` assets are expected later; Phase 2 will use clearly
  temporary placeholders.
- The ۵۰۰,۰۰۰ تومان free-shipping figure is UI copy only, to be treated as
  a configurable default once Phase 8 implements shipping.
- **Node/Next toolchain versions** (per Phase 0's note that these were
  unspecified): Node 22.x, npm 10.x were used in this sandbox; Next.js
  16.3.4, React 19.2.8, Tailwind CSS 4.3.3, ESLint 9.39.5,
  eslint-config-next 16.3.4 were installed as "latest" at the time of this
  session. These are recorded here so a future session can reproduce the
  same major versions rather than silently drifting; if the next session's
  environment has different toolchain versions available, that is fine —
  just note the actual versions used in that session's report.
- **Font strategy is a temporary fallback, not a final decision** — see
  "Known limitations" above. Treated as acceptable for this phase because
  Phase 1's acceptance criteria only require the header/footer to
  *resemble* the prototype and RTL to work, not pixel-perfect typography.
- Continuing to treat this sandbox's inability to persist the filesystem
  across sessions as an environment constraint, not a project decision —
  each session hands off via a packaged archive until a persistent
  repo/working directory is wired up.

## Known Issues / Technical Debt

- Vazirmatn not self-hosted yet (see "Known limitations").
- `eslint-config-next` + `FlatCompat` incompatibility under ESLint 9 is a
  documented trap — don't reintroduce `@eslint/eslintrc`/`FlatCompat` for
  this project without first checking whether it's still broken upstream.
- No automated tests exist yet (expected — `tests/*` is still
  `.gitkeep`-only; Phase 14 is where the test suite is required to be
  meaningful, though business-critical logic introduced in earlier phases
  should get tests as it's written, per the phase plan's general guidance).
- No CI configuration yet — not required by any phase so far, but worth
  adding once Phase 3+ introduces something worth gating (migrations,
  typecheck/lint/build on PR).

## Next Session Instructions

- Exact next objective: Execute PHASE 2 — Homepage visual migration, per
  `CLAUDE_BUILD_INSTRUCTIONS.txt` §D. Rebuild the prototype's actual
  homepage sections as real components, replacing the Phase 1 placeholder
  content in `src/app/page.tsx`:
  hero carousel, category circles, featured products grid, promo banners,
  new-arrivals grid, benefits strip, newsletter UI (already has a shell —
  just needs to move into a `NewsletterSection` component if it's reused
  elsewhere), search overlay UI, cart drawer UI shell, responsive
  behavior, reduced motion, keyboard/accessibility behavior.
- Use placeholder/demo data only (no database yet — that's Phase 3).
  Product/category demo content should come from a local
  constant/fixture file (e.g. `src/domains/catalog/demo-data.ts` or similar)
  rather than being inlined repeatedly in JSX, so Phase 3 can swap it for
  real queries with minimal component changes.
- Files/areas to inspect first:
  - This `PROGRESS.md`.
  - `reference/prototype.html` — specifically the hero carousel (`
    #heroCarousel`/`.hero-track`, autoplay/drag/dot logic, ~line 400-608
    region and the `<script>` block near the end), categories section,
    featured-products cards, promo-banners, new-arrivals, benefits-strip,
    search-overlay, and cart-panel HTML/CSS/JS — all of it, not just the
    header/footer already covered in Phase 1.
  - `src/app/page.tsx` (the Phase 1 placeholder to replace) and
    `src/components/ui/*` (reuse `Button`/`ButtonLink`/`Container`, add
    new primitives like `Card` only if genuinely reusable across sections).
- Expected acceptance criteria for Phase 2 (copied from build instructions):
  - Homepage closely matches the prototype visually.
  - Mobile/tablet/desktop responsive behavior works.
  - Interactions work (carousel drag/autoplay/dots, category hover,
    wishlist heart toggle, search overlay open/close, cart drawer shell
    open/close).
  - No hardcoded inline-JS architecture — behavior lives in proper
    React components/hooks.
  - Image handling uses production-appropriate patterns (`next/image` with
    explicit dimensions) even though real product photography doesn't
    exist yet — use styled placeholder blocks (matching the prototype's
    own `.asset-slot` treatment) rather than broken `<img>` tags.
- Do not attempt Phase 3 (database) or later phases in the same session —
  homepage visuals only.

## Commands

- install: `npm install`
- dev: `npm run dev` (or `npx next dev`)
- build: `npm run build` (or `npx next build`)
- start: `npm run start` (after build)
- lint: `npm run lint` (or `npx eslint .`)
- typecheck: `npm run typecheck` (or `npx tsc --noEmit`)
- test: not configured yet (Phase 14, or earlier if business-critical logic
  needs tests sooner — see "Known Issues / Technical Debt")
- db migration: not applicable yet (Phase 3)
- seed: not applicable yet (Phase 3)

Toolchain used this session: Node 22.22.2, npm 10.9.7, Next.js 16.3.4,
React 19.2.8, Tailwind CSS 4.3.3, TypeScript (see `package.json` for pinned
range), ESLint 9.39.5 + eslint-config-next 16.3.4.
