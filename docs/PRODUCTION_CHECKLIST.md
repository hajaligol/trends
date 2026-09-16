# Production readiness checklist

Phase 14's "production environment checklist" deliverable. Each item is
marked with its actual status in this codebase as of Phase 14 — not
aspirational. Items marked **BLOCKING** must be resolved before real
customer traffic; items marked **PRE-LAUNCH** are commonly acceptable to
defer briefly but must be tracked; items marked **DONE** are verified.

## Before every deploy

- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` (unit suite, no DB needed) passes.
- [ ] `npm run test:integration` passes against a database that mirrors the
      target schema (run `npm run db:migrate` first).
- [ ] `npm run build` succeeds **against the actual target `DATABASE_URL`**
      — see `docs/DEPLOYMENT.md`'s "Build-time database dependency". A
      build against a different/stale database can still succeed while
      being subtly wrong (e.g. missing a column a newer migration added).
- [ ] `npm run db:migrate` has been run against the target database before
      traffic is cut over to the new build.
- [ ] No `.env`/`.env.local` file, or its contents, is present in the
      built artifact or container image — confirm secrets are injected at
      runtime by the deployment platform, not baked in.

## Environment & configuration — DONE

- [x] Secrets live in environment variables only (`AUTH_SECRET`,
      `DATABASE_URL`, payment/SMS provider keys) — confirmed by grep, no
      hardcoded credentials anywhere in `src/`.
- [x] `.env.example` documents every variable the app reads or will read.
- [x] `.gitignore` excludes `.env*` (except `.env.example`).
- [x] Security headers sent on every route (`next.config.ts`):
      `Content-Security-Policy` (production-only), `X-Frame-Options`,
      `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
      `Strict-Transport-Security`.

## Environment & configuration — BLOCKING before real payments/SMS

- [ ] **A real Iranian payment gateway is configured.** Today only the
      mock provider (`src/domains/payments/provider.ts`) exists — real
      money cannot move through this application as deployed. This is
      correct per rule A.17 (never fabricate credentials) but is a hard
      launch blocker, not an oversight to silently work around.
- [ ] **An SMS/OTP provider is configured**, if OTP-based
      login/verification is required at launch. Currently
      `ConsoleNotificationProvider` logs instead of sending
      (`src/domains/notifications`).
- [ ] **Object storage/CDN for product media is configured**, if product
      photography will be uploaded outside of what ships in `public/`.
      `next.config.ts`'s `images.remotePatterns` is empty.

## Security — DONE (Phase 13 hardening pass)

- [x] All Server Actions/route handlers reviewed for auth/authorization
      checks (see Phase 13's write-up in `PROGRESS.md` for the full audit
      list and findings).
- [x] Rate limiting on signed-out-reachable, abuse-prone Server Actions
      (login, register, password reset, contact, newsletter, reviews) —
      `src/lib/security/rate-limit.ts`.
- [x] Passwords hashed with bcrypt (`src/domains/auth/password.ts`,
      12 rounds).
- [x] Sessions are JWT-based `HttpOnly`/`Secure`(production)/`SameSite`
      cookies — never `localStorage` (`src/lib/auth/config.ts`).
- [x] Cross-user ownership checks exist for addresses, cart, wishlist,
      orders — re-verified with real integration tests in Phase 14
      (`tests/integration/ownership.test.ts`), not just code review.
- [x] No secrets/stack traces/SQL/provider internals leaked in
      user-facing error messages (`src/app/error.tsx`,
      `src/app/global-error.tsx`, `src/app/admin/error.tsx`, and every
      Server Action's catch blocks reviewed in Phase 13).

## Security — PRE-LAUNCH / known limitations

- [ ] **CSP ships with `'unsafe-inline'` for `script-src`/`style-src`**,
      not a nonce-based strict policy. Documented in detail in
      `next.config.ts`'s header comment and Phase 13's `PROGRESS.md`
      write-up (finding #4). Upgrading requires `middleware.ts` generating
      a per-request nonce plus real-browser verification that hydration
      still works afterward — deferred because this sandbox has never had
      browser automation available to verify it safely (see "Known
      sandbox limitation" below).
- [ ] **Rate limiter is single-process/in-memory** — correct for today's
      single-instance deployment topology (see `docs/DEPLOYMENT.md`), but
      must move to a shared store before scaling to more than one Node
      process. Not a bug; a documented scaling boundary.
- [ ] Dependency vulnerability review: `npm audit` currently reports 4
      moderate-severity advisories, all in `drizzle-kit`'s dev-only
      `esbuild` dependency (not bundled into the production build/runtime
      — see Phase 13's write-up finding and `PROGRESS.md`'s "Known
      Issues"). Re-run `npm audit` before each deploy and re-triage; do
      not assume this list is still accurate by the time you read it.
- [ ] Run `npm audit` in the actual deployment target's Node/npm versions
      periodically (not just once at Phase 13) — advisories are
      discovered continuously, not just at build time.

## Known sandbox limitation — carried through every phase

**No real-browser / `Next-Action` wire-protocol verification has ever been
performed in this codebase's history** (every phase's session ran in a
sandbox with no browser automation tool available). Every phase instead
verified Server Actions and pages via: direct-to-domain calls, calling
exported Server Action functions with real `FormData`, and HTTP-level
`curl` requests with real NextAuth session cookies covering role-gating and
ownership. This is meaningfully thorough but is **not the same guarantee**
as clicking through the rendered app in a real browser. Before launch, a
session with browser automation (or a human QA pass) should click through
at minimum the 12 critical flows listed in
`CLAUDE_BUILD_INSTRUCTIONS.txt` Phase 14 end-to-end, plus the CSP
nonce-upgrade item above.

## Data & business rules — DONE

- [x] Money stored as integer Toman throughout, formatted only at the
      presentation boundary (`src/lib/utils/money.ts`, unit-tested).
- [x] Inventory decrements are concurrency-safe (`WHERE stock >= quantity`
      conditional update inside a transaction) — verified with real
      concurrent-request integration tests in Phase 14
      (`tests/integration/inventory-race.test.ts`), including a 5-way race
      for 3 units.
- [x] Coupon usage limits are concurrency-safe (`FOR UPDATE` row lock) —
      likewise verified with a real concurrent-request test in Phase 14
      (`tests/integration/coupon-validation.test.ts`).
- [x] Duplicate payment callbacks are idempotent — verified with real
      duplicate and genuinely-concurrent-duplicate callback tests in
      Phase 14 (`tests/integration/payment-idempotency.test.ts`).
- [x] Order snapshots (price/discount/shipping/customer info) are
      immutable at purchase time — schema-level (no FKs to mutable
      pricing), reviewed in Phase 3/8.

## Data & business rules — BLOCKING before launch

- [ ] **Shipping methods/fees/free-shipping threshold are placeholder
      business values** (see `PROGRESS.md`'s Phase 8 "Important
      Assumptions") — replace with real figures before accepting real
      orders.
- [ ] **No guest checkout** — every checkout requires an account. Confirm
      this is an acceptable launch constraint or scope guest checkout as
      a follow-up phase.
- [ ] **Policy page copy (privacy/terms/returns/shipping) is genuine but
      not legally reviewed** — each page says so in its own visible body
      text (Phase 12). Get real legal review before launch in Iran.
- [ ] **Refunds are a manual record-keeping status only** — no real
      refund-money integration exists (Phase 10). Confirm the operational
      process for actually returning money to a customer is defined
      outside this codebase.

## Accessibility, RTL, responsive — DONE (Phase 14 pass)

- [x] RTL is foundational (`dir="rtl"` at the document root, logical CSS
      properties used throughout — confirmed by the existing Tailwind
      class patterns across components).
- [x] Modal dialogs (cart drawer, search overlay) have `role="dialog"`,
      `aria-modal`, trap Tab/Shift+Tab focus within themselves, move focus
      into the dialog on open, and restore focus to the trigger element on
      close — added/fixed in Phase 14
      (`src/lib/hooks/useDialogA11y.ts`; previously the cart drawer had no
      dialog semantics and neither drawer trapped focus).
- [x] Error boundaries exist at the root, global, and admin levels
      (`src/app/error.tsx`, `src/app/global-error.tsx`,
      `src/app/admin/error.tsx`) with Persian, non-leaking messages.
- [x] 404 handling exists (`src/app/not-found.tsx`).
- [x] Keyboard focus styling is visible (Tailwind `focus:outline-2
      focus:outline-ink focus:outline-offset-2` pattern used on
      interactive elements — spot-checked across form inputs and the
      search overlay).

## Accessibility, RTL, responsive — NOT independently re-verified in a real browser this phase

- [ ] Full manual/automated axe-core or Lighthouse accessibility audit —
      not run (no browser automation available; see "Known sandbox
      limitation" above).
- [ ] Full responsive pass across real devices/viewports — Tailwind
      responsive utility usage was spot-checked by reading component code
      (breakpoint classes present and consistent with the design system),
      not visually verified pixel-by-pixel.
- [ ] `prefers-reduced-motion` behavior — present in the original
      prototype's intent (`TRENDS_PROJECT_CONTEXT.md`), carried into
      Tailwind's `motion-reduce:` usage where applied; not independently
      re-audited this phase.
