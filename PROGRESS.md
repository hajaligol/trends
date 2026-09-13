# Trends Progress Report

## Current Status
- Overall status: Promotions + payments (Phase 9) is implemented **and
  verified** this session — full network access was available.
  `npm install` (no new dependencies needed), a fresh migration for 4 new
  tables (`coupons`, `coupon_redemptions`, `payments`, `payment_events`)
  plus 2 new columns on `orders` (`coupon_id`, `coupon_code`), `typecheck`,
  `lint`, `build`, a fresh-clone migrate+seed check, a direct-to-domain
  smoke test (30 assertions, including a genuine coupon-usage-limit
  concurrency race and a genuine duplicate-payment-callback idempotency
  check), and HTTP-level checks against `npm run start` all ran and
  passed. See "Current Phase" below for full detail and what still
  wasn't exercised (real browser `Next-Action` wire protocol for
  `placeOrderAction`/`previewCouponAction` — same category of gap Phase 7
  and Phase 8 already documented).
- Current phase: none in progress — PHASE 9 is COMPLETE.
- Last completed phase: PHASE 9 — Promotions + payments
- Next phase: PHASE 10 — Orders + fulfillment + customer lifecycle
- Date: 2026-09-13

## Completed

### Phase 0 — Repository audit + implementation plan
Prototype structure, design tokens, missing assets, and architecture
decisions were audited. See git history for the full write-up if needed;
nothing here changed this session.

### Phase 1 — Next.js foundation + design system shell
Next.js App Router + TypeScript + Tailwind v4 foundation, design tokens
ported verbatim from the prototype, Header/Footer shell, Button/Container

primitives. Verified passing at the time.

### Phase 2 — Homepage visual migration (verified COMPLETE)
Rebuilt every homepage section from `reference/prototype.html` as React
components (hero carousel, category nav, featured products, promo
banners, new arrivals, benefits strip, search overlay, cart drawer).
Verified in a prior session (see git history for the full write-up).

### Phase 3 — Database + catalog domain (COMPLETE)
PostgreSQL + Drizzle catalog schema (`categories`, `products`,
`product_variants`, `product_images`), migrations, seed data, repository
layer. Verified in a prior session (see git history for the full
write-up).

### Phase 4 — Storefront catalog pages (COMPLETE)
Category pages, product listing/detail, variant selection, breadcrumbs,
related products, pagination/sorting/filters. Verified in a prior session.

### Phase 5 — Search + SEO foundations (COMPLETE)
Real PostgreSQL-backed search, URL-driven filters, metadata/canonical/OG,
sitemap/robots, `Product` JSON-LD. Verified in a prior session (see git
history for the full write-up, including known follow-ups: search
relevance is a simple `ILIKE`, not full-text; category OG images;
`Product` JSON-LD's Toman-under-`IRR` currency mismatch — all still
outstanding, unrelated to Phase 6).

### Phase 6 — Authentication + customer account (COMPLETE)

**Goal:** real customer identity — registration, login, logout, secure
sessions, password reset, Iranian mobile normalization, an account
profile, and an address book — with server-side ownership checks, not
just hidden UI.

**Auth solution chosen:** **NextAuth v5 (`next-auth@beta`, currently
`5.0.0-beta.32`) — Credentials provider, `session.strategy: "jwt"`, no
database adapter.** Rationale, fully documented in
`src/lib/auth/config.ts`'s header comment: a Credentials-only flow with
JWT sessions needs no adapter (adapters model OAuth-shaped identity,
a poor fit for mobile+password), and JWT-in-an-HttpOnly-cookie is what
NextAuth manages itself — the token never touches client JS or
`localStorage`, satisfying rule A.12/G. Verified this session (see
"Tests/checks") that failed logins set no session cookie, successful
logins set `authjs.session-token` as `HttpOnly; SameSite=Lax`, and
`/api/auth/signout` actually clears it.
`next-auth@beta`'s own `peerDependencies` explicitly list `next: '...
|| ^16.0.0'` and `react: '... || ^19.0.0'` — confirmed compatible with
this project's Next 16.3.4/React 19 before installing, not assumed.

Password hashing: `bcryptjs` (pure JS, no native build step) via a thin
wrapper in `src/domains/auth/password.ts`, 12 salt rounds.

**New dependencies added** (`package.json`): `next-auth@beta`,
`bcryptjs`, `zod`. (`@types/bcryptjs` was attempted but `bcryptjs@3.x`
ships its own types, so nothing extra was actually needed there.)

**New schema** (`src/lib/db/schema/`, migration
`drizzle/migrations/0001_perpetual_marten_broadcloak.sql`, applied and
verified against a real local Postgres):
- `users.ts`: `mobile` (canonical `+98XXXXXXXXXX`, unique) is the login
  identifier, not email, per TRENDS_PROJECT_CONTEXT.md §3/§5. `email`
  optional (unique when present). `role` is a Postgres enum
  (`customer`/`staff`/`admin`) per §7's "prefer explicit roles over one
  boolean `isAdmin`" — Phase 11 (admin) will read this, nothing enforces
  it yet since there's no admin area to protect. `mobileVerified`
  (boolean, defaults `false`) exists for a future real OTP/SMS provider
  to set — nothing sets it `true` yet since none is configured (rule
  A.17). `passwordHash` never leaves this file's `toPublicUser()`
  helper's output.
- `addresses.ts`: Iranian address book fields exactly per §5 (recipient
  name/mobile, province, city, address line, postal code, optional
  plaque/unit + delivery notes). Documented in-file as the *current*
  address book, not what an order snapshots — Phase 8's `orders` table
  will copy fields at purchase time rather than FK-ing to a row here,
  since this table's rows can be edited/deleted after an order ships.
- `password-reset-tokens.ts`: only a SHA-256 hash of the raw token is
  stored (same "never store the actual secret" principle as
  `passwordHash`), 30-minute TTL, single-use via nullable `usedAt`.

**New domain code:**
- `src/lib/utils/phone.ts` — Iranian mobile normalization to canonical
  `+98XXXXXXXXXX`, accepting `09...`/`9...`/`+98...`/`0098...` and
  Persian/Arabic-Indic digits. Exports `toAsciiDigits` too, reused by the
  postal-code validator.
- `src/lib/validation/auth.ts` — Zod schemas for every auth/address
  mutation (register/login/forgot-password/reset-password/address),
  including a `z.preprocess` step that normalizes mobile numbers
  *before* the regex check runs.
- `src/domains/auth/{password,queries,reset-tokens,notifications,actions}.ts`
  — password hashing wrapper; user CRUD (with a `MobileAlreadyRegisteredError`
  for a friendly duplicate message, backed by the real unique index, not
  just an app-level check); reset-token issue/verify/consume; a
  **clearly-labeled notification stub** that logs the password-reset link
  to the server console instead of pretending to send a real SMS, since
  no SMS/email provider is configured — same "don't fabricate a live
  integration" principle as the payment-provider rule, applied here too;
  and every Server Action (register/login/logout/forgot-password/reset-password).
- `src/domains/addresses/{queries,actions}.ts` — every query function
  takes `userId` and scopes by it; there is deliberately no
  `getAddressById(id)` without a `userId` parameter, so it's structurally
  hard for a future caller to skip the ownership check. Verified this
  session (see "Tests/checks") that a second user genuinely cannot read,
  update, or delete a first user's address by ID.
- `src/lib/auth/config.ts` + `next-auth.d.ts` — NextAuth config and the
  TypeScript module augmentation for `session.user.{id,mobile,role}`.

**New routes/pages:** `/register`, `/login`, `/forgot-password`,
`/reset-password/[token]`, `/api/auth/[...nextauth]`, and a protected
`/account` layout (redirects to `/login` if not authenticated) with
`/account` (profile overview) and `/account/addresses` (list/add/edit/delete,
default-address exclusivity enforced in a DB transaction). All forms use
`useActionState` + a shared `FormField`/`SubmitButton` component pair
(rule "reusable components, don't duplicate large JSX").

**Header wiring — a deliberate architecture decision, not just
"connect the button":** The account icon in `src/components/layout/Header.tsx`
now links to `/account` or `/login` based on session state, read via
NextAuth's client-side `useSession()` (wrapped in
`src/components/auth/AuthSessionProvider.tsx`, added to the root layout)
— **not** by calling `auth()`/`cookies()` in `RootLayout` itself. That
would have forced `cookies()` to run on every request through the shared
root layout, which opts the *entire site* out of static rendering,
including the homepage Phase 2/4 verified as statically prerendered.
Verified this session: `npm run build` still shows `/` as `○ (Static)`
after this change. This is a presentation-only tradeoff (a brief
"logged out" flash before the client fetches `/api/auth/session`) — it
does not weaken any real security boundary, since every protected route
and every mutation independently calls `auth()` server-side. Full
reasoning is in `AuthSessionProvider.tsx`'s header comment.

**A real bug found and fixed during verification:** `createUser`/
`findUserByMobile` originally trusted that the mobile number passed in
was already normalized (true for the Server Action call path, which
goes through `registerSchema`'s `mobileSchema` first) — but a smoke test
calling `createUser` directly with an un-normalized number
(`"09121234567"` vs. the already-registered `"+989121234567"`) created a
second row for the same real phone number, defeating the unique
constraint's purpose. Fixed by normalizing defensively *inside* the
domain layer too (`normalizeOrThrow` in `src/domains/auth/queries.ts`),
not just at the validation layer — the domain layer is documented as
"the actual boundary" and shouldn't assume every future caller (a script,
an admin tool, Phase 11) remembers to pre-normalize. Re-verified after
the fix: duplicate correctly rejected regardless of input format.

**Tests/checks — all run against a real local PostgreSQL 16 instance and
a real `next build` + `next start` production server, not just `next
dev`:**
- `npm run typecheck` — clean. (One real issue caught and fixed along
  the way: augmenting `next-auth/jwt`'s `JWT` interface silently didn't
  work, because that module is a pure `export * from "@auth/core/jwt"`
  re-export — TypeScript declaration merging doesn't reach through a
  re-export. Fixed by augmenting `@auth/core/jwt` directly instead,
  which is where the interface NextAuth's callbacks actually use is
  declared.)
- `npm run lint` — clean.
- `npm run build` — clean; `/` and other content pages remain `○
  (Static)`; `/account`, `/account/addresses`, `/login`, `/register`,
  `/reset-password/[token]`, and the NextAuth route are correctly `ƒ
  (Dynamic)`.
- Manual end-to-end HTTP verification against `npm run start` (with
  `trustHost: true` added to `src/lib/auth/config.ts` after the first
  attempt hit NextAuth's `UntrustedHost` error under `next start` —
  documented in-file why this is safe: it doesn't affect
  `AUTH_SECRET`-based cookie signing, the actual security boundary):
  - Wrong password → HTTP 302, **no** session cookie set.
  - Correct password → HTTP 302, `authjs.session-token` set as
    `HttpOnly; SameSite=Lax` (confirmed via `curl -v`, not just assumed
    from a 200 response).
  - `/api/auth/session` with the cookie → correct `id`/`mobile`/`role`
    payload.
  - `/account` with the cookie → HTTP 200, page content (name, email)
    genuinely reflects the logged-in user's DB row.
  - `/account` without the cookie → HTTP 307 to `/login`.
  - `/api/auth/signout` → session cleared; `/api/auth/session` afterward
    returns `null`; `/account` afterward redirects again.
  - Duplicate-mobile registration rejected (after the fix above), in
    both already-normalized and raw-input forms.
  - Password-reset token lifecycle: issue → verify (valid) → consume →
    verify again (correctly `null`, single-use enforced) → a bogus token
    also correctly returns `null`.
  - Cross-user address ownership: a second user's attempts to read,
    update, or delete a first user's address by ID all correctly no-op
    (return `null`/`false`), the address is unmodified, and the owner
    can still delete their own address normally. Default-address
    exclusivity (only one `isDefault: true` row per user) verified via a
    second default-address insert correctly unsetting the first.
  - All smoke-test rows deleted afterward — the database is back to its
    seeded-catalog-only state.

**Known limitations / follow-ups (not blocking, documented rather than
silently ignored):**
- Password reset "sends" via `console.log` only (`src/domains/auth/notifications.ts`)
  — no real SMS/email provider is configured (`SMS_PROVIDER_API_KEY` is
  blank in `.env.example`). Swap that one function's body once a real
  provider is chosen; no call-site changes needed elsewhere.
- The Header's logged-in/out state can lag by one client-side session
  refetch immediately after login/logout, since `redirect()` inside a
  Server Action is a client-side route transition, not a hard reload,
  and NextAuth's `SessionProvider` doesn't automatically revalidate on
  every Next.js navigation. Cosmetic only (a stale icon for a moment);
  not a security issue since every real check is server-side. A future
  session could tighten this with `router.refresh()` after
  login/logout or `useSession()`'s `update()`.
- `role` exists on `users` and flows through the session, but nothing
  reads/enforces it yet — that's Phase 11 (admin).
- Registration signs the user in immediately with no email/mobile
  verification step (`mobileVerified` stays `false` forever right now).
  This was a documented assumption (rule A.18): no real OTP/SMS provider
  exists yet to verify against, and blocking registration on a
  verification step that can't actually happen yet would just break
  the flow. Revisit once Phase 6+/12's real SMS provider exists.
- No rate limiting on login/register/forgot-password yet — that's
  explicitly Phase 13's job ("rate limiting for sensitive/public
  abuse-prone endpoints"), not silently forgotten.
- `AUTH_SECRET` in this sandbox's `.env.local` is a placeholder dev
  value, not a real secret — same "sandbox-local, not a deliverable"
  caveat as Phase 3's `.env.local`. Generate a real one
  (`openssl rand -base64 32`) per environment.

### Phase 7 — Wishlist + cart (COMPLETE)

**Goal:** real shopping state — guest cart, authenticated cart,
variant-aware add/update/remove, server-authoritative price/stock,
guest→user cart merge on login, and a persisted wishlist for logged-in
users — replacing Phase 2's `demo-data.ts` fixture entirely.

**New schema** (`src/lib/db/schema/`, migration
`drizzle/migrations/0002_groovy_wrecker.sql`, applied and verified
against a real local Postgres):
- `carts.ts` — one row per user (`userId` unique-when-not-null via
  `uniqueIndex`) or per anonymous guest. A guest cart's identity *is*
  its own random `uuid`, handed to the browser as an HttpOnly cookie
  (`src/domains/cart/session.ts`'s `trends_guest_cart`) — the same
  "unguessable id as bearer token" pattern as e.g. Shopify cart tokens.
- `cart_items.ts` — variant-aware (never a bare product — a cart line is
  "this T-shirt, size M, black", not "a T-shirt"). `uniqueIndex(cartId,
  variantId)` at the database level (rule F.3) prevents duplicate lines;
  adding an already-present variant increments the existing row via
  `ON CONFLICT DO UPDATE` instead. `quantity > 0` check constraint.
  **No price snapshot is stored** — price/stock are always read live
  from `product_variants` at query time (`getCartSummary`), per §4.3
  "server is authoritative". Order *snapshots* are a deliberately
  different, later concept (Phase 8).
- `wishlist-items.ts` — authenticated-only (no guest wishlist table).
  `uniqueIndex(userId, productId)` for duplicate prevention.

**New domain code:**
- `src/domains/cart/queries.ts` — the sanctioned cart read/write layer:
  `getCartSummary` (live price/stock join + batched image lookup +
  per-line `isAvailable`/`isQuantityReduced` flags so a line whose
  variant/product went inactive or whose stock dropped below what's in
  the cart is visibly flagged and excluded from the subtotal rather than
  silently wrong), `addItemToCart` (stock-capped upsert), `updateCartItemQuantity`/
  `removeCartItem` (both ownership-scoped by `cartId`, returning `false`
  for a wrong-cart item id rather than throwing), `clearCart`.
- `src/domains/cart/session.ts` — the guest-cart HttpOnly cookie
  helpers. Split into a read-only function (safe during Server Component
  rendering) and a write function (only callable from a Server
  Action/Route Handler, since Next.js forbids setting cookies during
  render).
- `src/domains/cart/resolve.ts` — resolves "which cart" for the current
  request: `resolveCurrentCartId()` (write path — creates a cart/cookie
  if needed, used by every mutation) vs. `getCurrentCartIdReadOnly()`
  (read path — never creates anything, used by the initial client-side
  cart load).
- `src/domains/cart/merge.ts` — `mergeGuestCartIntoUserCart`: sums
  quantities line-by-line into the user's cart (creating it if this is
  their first), then deletes the guest cart. Safe no-op when there's no
  guest cart at all. Hooked into `registerAction` and `loginAction`
  (`src/domains/auth/actions.ts`) right after `signIn()` succeeds.
- `src/domains/cart/actions.ts` — Server Actions
  (`addToCartAction`/`updateCartItemQuantityAction`/`removeCartItemAction`/
  `clearCartAction`/`getCurrentCartAction`), each re-resolving the
  current cart itself rather than trusting a client-supplied cart id
  (same ownership principle as `addresses/actions.ts`), returning the
  fresh `CartSummary` so the client updates from the real result instead
  of guessing.
- `src/domains/wishlist/{queries,actions}.ts` — same ownership-scoped
  shape as `addresses/queries.ts` (every function takes `userId`).
  `toggleWishlistAction` re-checks `auth()` server-side regardless of
  what the client believes; `getWishlistedProductIdsAction` is the
  client's one-shot "give me all my wishlisted ids" read.
- `src/domains/catalog/queries.ts` gained `getProductSummariesByIds` so
  the wishlist page's product cards reuse the exact same read-model as
  every other product grid instead of a bespoke shape.

**Client-side architecture — deliberately mirrors Phase 6's
`AuthSessionProvider` pattern, for the same reason:** `CartProvider`
(`src/components/cart/CartProvider.tsx`) and `WishlistProvider`
(`src/components/wishlist/WishlistProvider.tsx`) both fetch their data
client-side, once, via a Server Action used as a plain read
(`getCurrentCartAction`/`getWishlistedProductIdsAction`) rather than the
root layout calling `auth()`/`cookies()` server-side. Resolving either a
guest cart cookie or a signed-in session requires reading a cookie —
doing that in `RootLayout` (shared by every route) would opt the entire
site, including the homepage, out of static rendering. Verified this
session: `npm run build` still shows `/` as `○ (Static)` after wiring
both providers into the root layout. `WishlistButton` reads/writes
`WishlistProvider`'s context when signed in, but falls back to a
**local-only, non-persisted** `useState` toggle for guests — deliberately
not a fake write that would vanish on refresh (rule G), matching §6
"sensible guest behavior".

**UI wired to real data (Phase 2's demo fixture fully retired):**
- `src/components/overlays/CartDrawer.tsx` — rewritten to read
  `useCart()`: real line items, quantity steppers (capped at live
  stock), per-line removal, a real subtotal, and a visible notice when
  some lines are unavailable and excluded from it. Checkout is Phase 8,
  so the "تسویه حساب" button is an intentionally **disabled** placeholder
  rather than a link to a route that doesn't exist (rule G).
- `src/components/layout/Header.tsx` — the cart-count badge now reads
  `useCart().cart.itemCount` instead of `demoCartItems.length`.
- `src/components/catalog/VariantSelector.tsx` — gained a real quantity
  stepper and "افزودن به سبد خرید" button (previously display-only,
  explicitly deferred to this phase). Calls `addItem` with the selected
  variant's *id* only — price/stock are re-read server-side, never
  trusted from what's displayed.
- `src/components/ui/WishlistButton.tsx` — now takes a `productId` and
  is genuinely persisted for signed-in users.
- New `/account/wishlist` page + sidebar link — the one place in the app
  that's allowed to read wishlist data server-side without the
  static-rendering concern above, since everything under `/account`
  already requires `auth()` in its layout and is already dynamic.
- Removed `src/domains/cart/demo-data.ts` (Phase 2 fixture, no longer
  referenced anywhere) and the already-unused, now-broken-by-this-change
  `src/components/home/ProductCard.tsx` dead file left over from Phase 2
  (superseded by `src/components/catalog/ProductCard.tsx` since Phase 4;
  confirmed via grep that nothing imported it before deleting).

**Tests/checks — all run against a real local PostgreSQL 16 instance and
a real `next build` + `next start` production server:**
- `npm run typecheck` — clean.
- `npm run lint` — clean. (One real issue caught and fixed:
  `WishlistProvider`'s first draft called `setState` synchronously in an
  effect body for the signed-out-reset branch, which
  `react-hooks/set-state-in-effect` correctly flagged. Fixed by deriving
  `isAuthenticated`/`isLoading` from `status` + a "has the authenticated
  fetch completed" flag instead, so every `setState` call happens inside
  a `.then()`/`.finally()` callback, matching `CartProvider`'s
  already-clean pattern.)
- `npm run build` — clean; `/` and other content pages remain `○
  (Static)`; `/account/wishlist` (new) is correctly `ƒ (Dynamic)`
  alongside the rest of `/account/*`.
- Fresh-clone check: `drizzle-kit migrate` against a brand-new database
  applied all 3 migrations cleanly (including Phase 6's) and `db:seed`
  populated the catalog — confirms a new clone still bootstraps
  end-to-end, not just this session's already-migrated database.
- Direct-to-domain smoke test (written as a scratch script, run once via
  `tsx`, then deleted — not left in the repo as a permanent test, since
  this project doesn't have a real test runner configured yet, that's
  Phase 14's job) against the real seeded database: add-to-cart, adding
  the same variant twice sums quantities rather than duplicating rows,
  requesting far more than stock caps at live stock, quantity
  update/removal, **a wrong-cart item id cannot be mutated** (ownership
  enforcement), guest→user merge correctly moves the line and deletes
  the guest cart, merging with no guest cart is a safe no-op,
  `clearCart` empties it, and wishlist add/idempotent-re-add/remove all
  behaved correctly. All test rows deleted afterward.
- HTTP-level checks against `npm run start`: `/`, `/category/men`,
  `/search?q=...`, `/product/classic-shirt`, `/login`, `/register` all
  return 200 with the expected markup present (e.g. "افزودن به سبد
  خرید" on the product page); `/account` and `/account/wishlist` return
  307 to `/login` when signed out.
- **What was *not* verified this session, and why:** the actual
  browser-driven Server Action network calls (`addToCartAction` etc.
  invoked the way a real client bundle invokes them, via the
  `Next-Action` RSC wire protocol) were not exercised through raw
  `curl` — that protocol's per-build action-id hashing isn't practical
  to hand-construct, and this sandbox has no headless-browser tool
  available. The business logic those actions call
  (`src/domains/cart/queries.ts`/`merge.ts`, `wishlist/queries.ts`) is
  fully covered by the direct-to-domain smoke test above, and the
  Server Action wrapper functions themselves are thin (parse input,
  resolve cart, call a query function, return its result) — but a real
  browser click-through of add-to-cart → cart drawer → login → merge
  has not been done. The next session (or a session with browser
  automation available) should do this before Phase 8 relies on cart
  contents being trustworthy end-to-end.

**Known limitations / follow-ups (not blocking, documented rather than
silently ignored):**
- A cart line's displayed `requestedQuantity` can exceed live stock
  between reads (e.g. someone else buys the last unit while it's sitting
  in your cart) — `getCartSummary` computes an `effectiveQuantity`/
  `isQuantityReduced` flag for *display and totals* but does not
  persist the correction back to the row. The next read always
  recomputes correctly, so nothing is ever overcharged, but the raw
  `cart_items.quantity` column can look stale if inspected directly.
  Revisit if a future phase needs the persisted value to always match.
- No optimistic UI updates for cart/wishlist mutations — every action
  waits for the server round-trip before updating. Fine for this phase's
  scope; a future pass could add optimistic updates with rollback if the
  round-trip latency becomes noticeable.
- The cart-count badge in the Header always renders (even at zero),
  matching the prototype's original demo behavior — not changed this
  phase since it wasn't part of the Phase 7 task list.
- See the "What was *not* verified" note above — real browser
  Server-Action verification is still outstanding.

### Phase 8 — Checkout + shipping (COMPLETE)

**Goal:** a real Iranian checkout flow — address selection, shipping
method, server-authoritative order totals, concurrency-safe inventory
decrement, immutable order/line-item snapshots — with the payment
*interface boundary* ready but no fabricated live gateway (§8/A.17).

**New schema** (`src/lib/db/schema/`, migration
`drizzle/migrations/0003_remarkable_lady_ursula.sql`, applied and
verified against a real local Postgres and a brand-new one):
- `orders.ts` — an explicit `order_status` Postgres enum
  (`pending_payment`/`paid`/`processing`/`shipped`/`delivered`/
  `cancelled`/`refunded`) per §6 "should be explicit and validated, not
  arbitrary strings" — only `pending_payment` is actually reachable this
  phase (no payment provider to advance it to `paid`; fulfillment
  transitions are Phase 10). The full enum is modeled now so Phase 9/10
  transition into a real value instead of needing a migration later.
  Every field a customer saw at checkout is copied onto the row as an
  **immutable snapshot** — shipping address (recipient/mobile/province/
  city/address line/postal code/plaque/notes), shipping method
  (code/label/estimate), and money (subtotal/shipping fee/discount/total,
  integer Toman, non-negative check constraints) — never a foreign key
  to `addresses`, since an address book row can be edited/deleted after
  the order ships (§14 "historical order data remains stable"). Human
  friendly `orderNumber` (`TR-YYMMDD-XXXX`, unique-indexed) is what
  `/order/[orderNumber]` uses in the URL, not the internal uuid (§8 "do
  not expose internal IDs unnecessarily"). `discountToman` defaults to
  `0` — real coupons are Phase 9; the column exists now so that phase
  needs no migration.
- `order-items.ts` — one row per purchased line, **also** a full
  snapshot (product title/slug/SKU/size/color/image, unit price,
  compare-at price, quantity, line total) — unlike `cart_items` (Phase
  7), which deliberately stores no price and always reads live.
  `productId`/`variantId` are nullable FKs with `onDelete: "set null"`
  purely for a future admin UI's convenience link-back; deleting a
  product/variant later never touches historical order data.

**New domain code:**
- `src/domains/shipping/methods.ts` — a small typed config module (not a
  database table) for the two shipping methods (standard/express) and
  the free-shipping threshold, per rule F.1/F.6 ("simplest
  production-safe solution", "fewer dependencies") for something this
  static; every call site goes through `listShippingMethods`/
  `getShippingMethod`, so promoting this to a table later (if admin
  editing becomes a real requirement, §7) is a contained change.
  **Assumption, documented per rule A.18:** the fee amounts
  (₮90,000/₮180,000), the ₮2,000,000 free-shipping threshold, and the
  courier-style labels are placeholder business values, not sourced from
  a real contracted Iranian courier — flagged for the store operator to
  replace before launch.
- `src/domains/payments/provider.ts` — the `PaymentProvider` interface
  (§8 "payment abstraction boundary") plus the one implementation this
  repo actually ships, `NotConfiguredPaymentProvider`, whose `initiate()`
  always returns an honest "gateway not configured" result — it never
  fabricates a redirect URL or claims a real integration exists (rule
  A.17). `getPaymentProvider()` is the single place that will branch on
  a real `PAYMENT_PROVIDER` value once Phase 9 adds a real adapter (e.g.
  ZarinPal); nothing else in the codebase should ever import a concrete
  provider class directly.
- `src/domains/orders/queries.ts` — `createOrderFromCart`, the core of
  this phase, in one Postgres transaction:
  1. Re-reads each cart line's **live** price/stock/active-flags (never
     the client's view) and rejects up front (fast path) if a line is
     inactive or under-stocked.
  2. Decrements `product_variants.stock` with a **conditional** `UPDATE
     ... SET stock = stock - :qty WHERE id = :id AND stock >= :qty
     RETURNING id`, not a read-then-write pair — this, not the pre-check
     above, is what actually makes it concurrency-safe. If the
     `RETURNING` set is empty (another checkout won the race), it throws
     `InsufficientStockError`, rolling back the whole transaction.
     Verified for real under an actual concurrent race — see
     "Tests/checks".
  3. Inserts `orders` + `order_items` with the frozen snapshot, retrying
     the (astronomically unlikely) order-number collision up to 3 times
     via Postgres's `23505` unique-violation error code.
  4. Clears the cart (`DELETE FROM cart_items WHERE cart_id = ...`).

  Any thrown error (`EmptyCartError`/`InsufficientStockError`/anything
  else) rolls back every step — verified that a failed checkout leaves
  stock, the cart, and the orders table completely untouched, not
  partially applied.
  Also exports `getOrderForUser`/`listOrdersForUser`, both ownership
  scoped by `userId` — same "no bare `getOrderById`" shape as
  `addresses/queries.ts`/Phase 7's cart queries.
- `src/domains/orders/actions.ts` — `placeOrderAction`, the Server
  Action wiring checkout together. The client only ever sends an
  `addressId` and a `shippingMethodCode` (plus a free-text note) —
  **never a price**. Every dollar amount in the resulting order is
  computed here server-side from: the authenticated session's real
  `userId` (never trusted from the client), an address row independently
  re-fetched and ownership-checked via `getAddressForUser`, the live
  cart via `getCartSummary` (re-checked for `isAvailable`/
  `isQuantityReduced` issues before allowing checkout — §8 "cannot
  checkout unavailable inventory"), and a shipping method resolved
  server-side via `getShippingMethod`. After a successful order, calls
  `getPaymentProvider().initiate()` and surfaces its honest
  "not configured" message as `paymentNote` — never marks anything paid
  based on this call (§5 "never trust the browser return page as proof
  of payment" applies in spirit even pre-Phase-9: initiation success
  ≠ payment success).

**New routes/pages:**
- `/checkout` (`src/app/checkout/page.tsx` + `src/components/checkout/CheckoutView.tsx`)
  — a single-page checkout (address selection, shipping method, order
  note, live order summary, place-order button) rather than a multi-step
  wizard; §6 lists checkout's steps as logical sections, not necessarily
  separate routes, and single-page checkout is a normal pattern at this
  store's scale. Coupon application (§6 step 5) is deliberately absent —
  Phase 9's job; `orders.discountToman` already exists so no migration
  will be needed to wire it in. Requires a signed-in session (redirects
  to `/login` — see "Important Assumptions" on why there's no
  `callbackUrl` round-trip yet) and a non-empty cart (redirects to `/`
  otherwise). Reuses `AddressForm` (Phase 6) inline for "add a new
  address without leaving checkout," syncing the client component's
  local selection state from fresh server props via
  `router.refresh()` — implemented using React's "adjust state during
  render" pattern (comparing the incoming prop reference against a
  tracked previous value) rather than a `useEffect`, since
  `react-hooks/set-state-in-effect` correctly flagged the first draft's
  `useEffect`-based version.
- `/order/[orderNumber]` (`src/app/order/[orderNumber]/page.tsx`) — the
  order confirmation/detail page, ownership-scoped via `getOrderForUser`
  (a non-owner's request → `notFound()`, verified for real over HTTP —
  see "Tests/checks"). Shows the frozen shipping/shipping-method/money
  snapshot and a clear "پرداخت آنلاین هنوز پیکربندی نشده" notice while
  `status === "pending_payment"`. This is *not* the Phase 10 order-history
  list (`/account/orders` doesn't exist yet, deliberately — see "Known
  limitations").
- `src/components/cart/CartProvider.tsx` gained a `refresh()` method so
  the Header badge/cart drawer can re-sync after `placeOrderAction`
  empties the cart server-side (outside any of `CartProvider`'s own
  mutation functions).
- `src/components/overlays/CartDrawer.tsx`'s "تسویه حساب" button is now
  a real `<Link href="/checkout">` (closing the drawer on click) instead
  of Phase 7's disabled placeholder; still disabled when the cart is
  empty or has unavailable items.

**Tests/checks — all run against a real local PostgreSQL 16 instance and
a real `next build` + `next start` production server:**
- `npm run typecheck` — clean on the first attempt.
- `npm run lint` — one real issue caught and fixed: `CheckoutView`'s
  first draft synced local address-selection state from props inside a
  `useEffect`, which `react-hooks/set-state-in-effect` flagged; fixed by
  switching to the "adjust state during render" pattern described above.
  Clean after that.
- `npm run build` — clean; `/checkout` and `/order/[orderNumber]` are
  correctly `ƒ (Dynamic)`; `/`, `/category/[slug]`, `/product/[slug]`
  remain unaffected/static where they were before.
- Fresh-clone check: dropped and recreated a brand-new database
  (`trends_fresh_check`), ran `drizzle-kit migrate` against it — all 4
  migrations (including this phase's) applied cleanly — then `db:seed`
  populated the catalog and `\dt` confirmed all 12 tables exist,
  including `orders`/`order_items`. Database dropped afterward.
- Direct-to-domain smoke test (scratch script, run via `tsx`, deleted
  after — same reasoning as Phase 7, no test runner configured yet):
  happy-path order creation (correct total, correct snapshot values);
  stock decremented by exactly the ordered quantity; cart cleared after
  order; order item count/price/quantity correct; **owner can read the
  order, a second user cannot** (`getOrderForUser` returns `null`);
  **price-snapshot immutability** — changed the live variant price after
  the order existed, confirmed the order item's `unitPriceToman` was
  unaffected, then restored the price; empty-cart checkout correctly
  throws `EmptyCartError`; a cart requesting far more than available
  stock correctly throws `InsufficientStockError` **with stock, the
  cart, and the orders table all provably unchanged afterward**
  (transaction rollback verified, not assumed); and a genuine
  **concurrency race test** — set a variant's stock to exactly 1, fired
  two simultaneous `createOrderFromCart` calls via `Promise.allSettled`
  each requesting 1 unit, confirmed **exactly one fulfilled and one
  rejected**, and confirmed final stock landed at exactly `0` (never
  negative, never left at `1`). All 12 assertions printed `PASS`. All
  test rows deleted and stock levels restored to the seeded baseline
  afterward (verified via a follow-up `SELECT`).
- HTTP-level checks against `npm run start`, using **real NextAuth
  session cookies** obtained via `/api/auth/csrf` → `/api/auth/callback/credentials`
  (not just direct-to-domain calls) for two separate test users:
  - `/checkout` signed out → 307 to `/login`.
  - `/checkout` signed in with an empty cart → 307 to `/`.
  - `/checkout` signed in with a real cart item + a real saved address →
    200, page genuinely contains the address, shipping-method section,
    and "ثبت سفارش" button.
  - `/order/[orderNumber]` for a real order, as its owner → 200, page
    contains the real order number, "در انتظار پرداخت" status, and the
    purchased product's title.
  - `/order/[orderNumber]` for that **same** order as a **different**
    logged-in user → 404 (not the order's data) — cross-user ownership
    enforced at the HTTP layer, not just in the query function.
  - `/order/[orderNumber]` signed out → 307 to `/login`.
  - All test users/carts/addresses/orders deleted afterward; the one
    variant whose stock was decremented during this HTTP pass
    (`CLASSIC-SHIRT-1`) was restored to `25` and verified via `SELECT`.
- **What was *not* verified this session, and why:** `placeOrderAction`
  itself was not invoked through a real browser's `Next-Action` RSC wire
  call (same limitation Phase 7 documented for its cart actions — no
  headless-browser tool in this sandbox, and hand-constructing that
  protocol's per-build action-id hashing isn't practical via raw
  `curl`). Instead, its two layers were verified separately: the
  business logic it calls (`createOrderFromCart`) via the exhaustive
  direct-to-domain test above, and its surrounding page/session/HTTP
  behavior (redirects, ownership, rendering) via the real cookie-based
  HTTP checks above. What specifically was *not* exercised end-to-end is
  clicking "ثبت سفارش" in an actual rendered browser page and watching
  the resulting `router.push` navigate to the confirmation page. A
  session with browser automation available should do this once before
  Phase 9 builds a payment flow on top of checkout.

**Known limitations / follow-ups (not blocking, documented rather than
silently ignored):**
- **Checkout requires a signed-in customer; there is no guest checkout.**
  This is a documented assumption (rule A.18), not an oversight: the
  address book (`addresses`) has been authenticated-only since Phase 6,
  and a parallel guest-address model is real, separate scope that
  TRENDS_PROJECT_CONTEXT.md doesn't specifically call for. If guest
  checkout becomes a real requirement, it needs its own design pass
  (where does a guest's shipping address live? how does
  `orders.userId`, currently `NOT NULL`, accommodate a guest order?).
- **No `callbackUrl` round-trip from `/checkout` through `/login` back to
  `/checkout`.** An unauthenticated visitor lands on a plain `/login`
  and has to navigate back manually (e.g. via the cart drawer). Not
  fixed this phase because it would mean modifying `loginAction`
  (Phase 6, already complete) for a nicety rather than a defect (rule
  B.4 "do not redo completed work unless fixing a defect"). Straightforward
  to add later: a `callbackUrl` search param read by `/login`'s page and
  threaded through to `loginAction`'s post-`signIn()` redirect.
- **No coupon application at checkout** — Phase 9's job. The schema
  (`orders.discountToman`) is ready; the UI/action logic to validate and
  apply a code is not.
- **No `/account/orders` order-history list yet** — that's explicitly
  Phase 10's task ("order history"). `/order/[orderNumber]` (this phase)
  is the checkout-confirmation/detail page, reachable right after
  placing an order or by knowing the order number; there's currently no
  in-app link to revisit a past order without it.
- **Shipping methods/fees/free-shipping threshold are placeholder
  business values** (see "New domain code" above) — replace with real
  figures before launch.
- **No inventory *reservation* window** — stock is decremented at the
  moment `createOrderFromCart` runs (i.e., at order placement), not
  reserved earlier in the checkout flow and released if the customer
  abandons payment. Since there's no live payment provider yet (Phase 9
  is what would need a reservation-then-confirm flow around a real
  gateway's redirect-and-return), this is the simplest correct behavior
  for this phase — revisit when Phase 9 wires in a real gateway with a
  meaningful gap between "order placed" and "payment confirmed."
- Order status is stuck at `pending_payment` forever right now (no code
  path advances it) — expected; Phase 9 (payment callback → `paid`) and
  Phase 10 (fulfillment transitions) are what move it further.
- See "What was *not* verified" above — real browser
  `Next-Action`-wire-protocol verification of `placeOrderAction` is
  still outstanding, same category of gap Phase 7 left for its own
  actions.
- Carried over from Phase 7, still outstanding: real browser Server
  Action verification for cart/wishlist actions.

### Phase 9 — Promotions + payments (COMPLETE)

**New database schema** (`src/lib/db/schema/`):
- `coupons.ts` — `code` (unique, stored upper-cased for case-insensitive
  lookup), `discountType` enum (`percentage`/`fixed`), `discountValue`
  (a `CHECK` constraint enforces 1-100 for percentage, >0 for fixed —
  Postgres, not just application code, rejects a nonsensical row),
  `minBasketToman`, `startsAt`/`endsAt`, `usageLimit` (nullable =
  unlimited), `perCustomerLimit` (nullable = unlimited, defaults to `1`),
  `isActive`. No category/product-restriction columns yet — not called
  for by any documented requirement this phase; "stacking rules" (§6) is
  satisfied by construction: an order has exactly one `couponId`, so
  coupons can never stack with each other.
- `coupon_redemptions.ts` — one row per successful redemption, written
  inside `createOrderFromCart`'s transaction. This table, not a counter
  column on `coupons`, is what usage-limit checks count against.
  `uniqueIndex(orderId)` — at most one redemption per order.
- `payments.ts` — one row per payment *attempt* (an order can have more
  than one, e.g. a failed attempt followed by a retry).
  `uniqueIndex(provider, providerRef)` is the mechanism idempotent
  callback handling relies on. `status` enum: `pending`/`succeeded`/`failed`.
- `payment_events.ts` — an append-only audit trail (§5
  "reconciliation-friendly records"), written on *every* callback
  invocation including duplicates, not just on state changes.
- `orders.ts` — added `couponId` (nullable FK, `onDelete: "set null"`,
  admin link-back convenience only) and `couponCode` (the actual
  display/audit source of truth, since a coupon row can later be
  edited/deleted while old orders that used it still exist).
- Migration: `drizzle/migrations/0004_rainy_devos.sql` (3 new enums, 4
  new tables, 2 new columns + 1 new FK on `orders`). Applied cleanly to a
  fresh database this session.

**New domain code — promotions** (`src/domains/promotions/`):
- `queries.ts` — `validateCoupon(executor, code, userId, subtotal)`,
  the single place that checks active/date-window/min-basket/usage-limit/
  per-customer-limit and computes the discount amount (capped so it can
  never exceed the subtotal). Takes either the plain `db` (read-only
  preview) or a transaction handle (`DbTransaction`, exported from
  `src/lib/db/client.ts` specifically for this) — when called with a
  transaction, it locks the `coupons` row with `FOR UPDATE` for the rest
  of that transaction, so two simultaneous checkouts racing for the last
  redemption of a `usageLimit`-capped coupon serialize against each
  other rather than both reading "capacity available." This mirrors
  Phase 8's conditional stock-decrement pattern: the guarantee comes from
  the database, not from a check-then-write race. `recordCouponRedemption`
  writes the redemption row, called only after the order row already
  exists.
- `actions.ts` — `previewCouponAction(code)`, a read-only Server Action
  the checkout UI calls before placing the order, purely for UX (shows
  the discount immediately). It never redeems anything. The authoritative
  check + actual redemption happen again inside `createOrderFromCart`
  when the order is actually placed — a code that validates at preview
  time can still legitimately fail at placement time (e.g. its usage
  limit fills up in between), which is correct per §4.3, not a bug.

**New domain code — payments** (`src/domains/payments/`):
- `provider.ts` — extended the `PaymentProvider` interface (established
  in Phase 8) with `verify(params): Promise<{verified: boolean}>` — the
  other half of "initiate → redirect → callback → verify." Kept
  `NotConfiguredPaymentProvider` as the default (`getPaymentProvider()`
  falls back to it for any `PAYMENT_PROVIDER` value other than `"mock"`).
  Added `MockPaymentProvider` — a **deliberately test-only, clearly
  labeled non-production** provider simulating a ZarinPal-style
  Authority/Status redirect-based gateway, since rule A.17 forbids
  inventing real gateway credentials in this environment and
  CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 9 task list explicitly calls for
  "one test/mock payment provider." Only active when
  `PAYMENT_PROVIDER=mock` is explicitly set — never the default, and its
  `name`/routes are labeled "mock" throughout.
- `queries.ts` — `createPendingPayment()` (writes the `payments` row
  right after a successful `initiate()` call) and
  `finalizePaymentVerification(provider, providerRef, verified, payload)`
  — the one function that turns a verification answer into a durable
  state change: locks the `payments` row `FOR UPDATE`, records a
  `callback_received` event unconditionally, and if the payment is no
  longer `pending` (i.e. this is a duplicate callback), records
  `duplicate_ignored` and stops — no further writes. Only if still
  `pending` does it write `succeeded`/`failed` onto the payment and, only
  on success, flip `orders.status` from `pending_payment` to `paid` in
  the same transaction (with its own `WHERE status = 'pending_payment'`
  guard as a second independent layer of the same idempotency property).
  This is the *only* place in the codebase that ever writes `paid` onto
  an order.

**Route handlers / pages:**
- `src/app/api/payments/callback/mock/route.ts` — the callback endpoint
  the mock gateway "redirects" to (`GET` with `Authority`/`Status` query
  params, the same shape a real redirect-based gateway uses). Calls
  `provider.verify()` and acts only on its answer via
  `finalizePaymentVerification` — never trusts the `Status` query param
  directly (§5 "never trust the browser return page as proof of
  payment"). Redirects to `/order/[orderNumber]?payment=success|failed|already-processed`.
- `src/app/payment/mock/[authority]/page.tsx` — a clearly-labeled
  (`noindex`, on-page Persian banner) test-only simulator page standing
  in for a gateway's hosted checkout page; its two buttons are literally
  links to the callback route with `Status=OK`/`Status=NOK`.

**Order/checkout wiring:**
- `createOrderFromCart` (`src/domains/orders/queries.ts`) now takes an
  optional `couponCode` parameter, validates + redeems it inside the same
  transaction as stock decrement and order insertion (so an invalid
  coupon rolls back everything, including the stock decrement), and
  computes `totalToman = subtotal + shippingFee - discount` (floored at
  0).
- `placeOrderAction` (`src/domains/orders/actions.ts`) threads the coupon
  code through, catches `CouponInvalidError` alongside the existing
  `InsufficientStockError`/`EmptyCartError`, and — after the order is
  created — calls the payment provider's `initiate()` and persists a
  `payments` row if it succeeds. Returns `redirectUrl` (to the gateway/
  simulator) alongside the existing `orderNumber`/`paymentNote`.
- Added `retryPaymentAction(orderNumber)` for a customer to re-attempt
  payment on their own still-`pending_payment` order (ownership enforced
  via `getOrderForUser`, no bare lookup) — creates a fresh `payments` row
  for the new attempt; any earlier attempt's row is untouched history.
- `CheckoutView.tsx` — added a coupon-code input (apply/remove, calls
  `previewCouponAction`, shows the resulting discount in the order
  summary) and changed order placement to `window.location.href` to
  `result.redirectUrl` when a provider is configured, falling back to
  `router.push` to the confirmation page when it isn't (unchanged
  Phase 8 behavior for the not-configured case).
- `/order/[orderNumber]` page — shows a discount line (with the coupon
  code) when `order.discountToman > 0`, a `?payment=` result banner
  driven by the callback's redirect, and a "پرداخت مجدد" (retry payment)
  button + `RetryPaymentButton` client component when the order is still
  `pending_payment`.

**Environment/config:** `.env.example`'s `PAYMENT_PROVIDER` comment now
documents the `mock` option and points at `MockPaymentProvider`'s header
comment. No new dependencies.

**Tests/checks — all run this session, full network access available:**
- `npx tsc --noEmit` — clean.
- `npx eslint .` — clean.
- `npm run build` — succeeds; `/` still statically prerendered;
  `/payment/mock/[authority]` and `/api/payments/callback/mock` both
  appear as new dynamic (`ƒ`) routes, everything else unchanged from
  Phase 8's route list.
- Fresh-database check: `DROP DATABASE`/`CREATE DATABASE`, `drizzle-kit
  migrate` (all 5 migrations, including this session's new one, applied
  cleanly), `npm run db:seed` — all succeeded from empty.
- **Direct-to-domain smoke test** (temporary `scripts/scratch-phase9.ts`,
  deleted after use — not part of the deliverable): 30 assertions, all
  passed:
  - Invalid/expired/inactive/below-minimum-basket coupon codes are all
    rejected with `CouponInvalidError`.
  - A percentage coupon computes the correct discount and is looked up
    case-insensitively (`test10` matches a coupon stored as `TEST10`).
  - A full order created with a valid coupon has the correct
    `discountToman`, `totalToman`, and `couponCode` snapshot.
  - **Per-customer limit**: the same user attempting to redeem a
    `perCustomerLimit: 1` coupon a second time is rejected, and — because
    the rejection happens inside the same transaction as the (would-be)
    stock decrement — the cart item from the failed attempt is confirmed
    still present (the whole transaction rolled back, not just the
    coupon check).
  - **Global usage limit**: a `usageLimit: 1` coupon succeeds once, then
    is rejected for a *different* customer's subsequent order.
  - **Genuine concurrency race**: a fresh `usageLimit: 1` coupon, two
    different users' orders fired via `Promise.allSettled` at the same
    time — exactly one order succeeded and exactly one was rejected,
    confirming the `FOR UPDATE` lock actually serializes the race rather
    than both racing past a read-then-write check.
  - **Full mock payment loop**: `getPaymentProvider()` returns the mock
    provider only when `PAYMENT_PROVIDER=mock`; `initiate()` returns an
    `ok: true` result with a `redirectUrl`/`providerRef`;
    `createPendingPayment` persists it; `provider.verify({Status: "OK"})`
    reports `verified: true`; `finalizePaymentVerification` transitions
    the payment to `succeeded` and the order to `paid`.
  - **Duplicate callback idempotency**: calling
    `finalizePaymentVerification` a second time with the same
    `providerRef` reports `already_processed`, the order's status is
    unchanged (`paid`, not re-processed), the payment row is still
    exactly `succeeded` (not double-applied), and `payment_events`
    contains exactly one `callback_received` per actual call (2 total),
    one `verified_succeeded`, and one `duplicate_ignored` — a real,
    inspectable audit trail, not just a boolean.
  - **Failure path**: `Status: "NOK"` reports `verified: false`;
    `finalizePaymentVerification` marks the payment `failed` and leaves
    the order at `pending_payment` (so `retryPaymentAction` can act on it
    later).
  - An unknown `providerRef` (a forged/garbled callback) reports
    `not_found` without touching any row.
  - With `PAYMENT_PROVIDER` unset, `getPaymentProvider()` returns the
    not-configured stub, whose `initiate()` never returns `ok: true` and
    whose `verify()` always reports `false` — a misconfigured environment
    can never be tricked into marking anything paid.
  - All test users/coupons deleted afterward (orders/payments referencing
    them were left in place by design — an order retains history even if
    the customer row is later removed — so the database was reset via
    `DROP DATABASE`/`CREATE DATABASE`/migrate/seed rather than row-level
    cleanup, and reseeded to the clean baseline state this report leaves
    the project in).
- **HTTP-level checks** against `npm run start` (a genuine listening
  server in this session, verified via `curl`):
  - `GET /` → `200`.
  - `GET /payment/mock/[authority]?orderNumber=...&amount=...` → `200`,
    renders without a real `payments` row existing (it's a static
    simulator page, independent of database state).
  - `GET /api/payments/callback/mock?Authority=...&Status=OK` for an
    authority with no matching `payments` row → `307` to `/` (the
    `not_found` branch), confirming a forged/garbled callback can't
    crash the route or leak whether any order exists.
  - `GET /order/[orderNumber]` (any number) while signed out → `307` to
    `/login` — ownership/auth gate still enforced at the HTTP layer.
  - `GET /checkout` while signed out → `307` to `/login` (unchanged from
    Phase 8, re-confirmed after this phase's edits).
- **What was *not* verified this session, and why:** the same category of
  gap Phase 7 and Phase 8 both documented — no browser-automation tool is
  available in this sandbox, so `previewCouponAction`/`placeOrderAction`/
  `retryPaymentAction` were not driven through a real browser's
  `Next-Action` RSC wire call, nor was a full authenticated
  browser-clicks-"شبیه‌سازی پرداخت موفق"-and-lands-on-the-confirmation-page
  round trip exercised end-to-end. Every piece of business logic those
  actions call was verified directly (above), and their surrounding
  HTTP/auth/redirect behavior was verified via real `curl` requests
  (above) — what's specifically missing is watching an actual rendered
  browser click through the whole coupon-apply → place-order → mock-gateway
  → callback → confirmation-page flow. A session with browser automation
  available should do this once, and should also close out the
  same-category gap already carried over from Phases 7 and 8.

**Known limitations / follow-ups (not blocking, documented rather than
silently ignored):**
- **No real payment gateway is configured** — by design, per rule A.17.
  `MockPaymentProvider` exercises the full protocol shape; a real
  ZarinPal-or-similar adapter is a contained addition inside
  `getPaymentProvider()` whenever real merchant credentials exist.
- **No coupon admin UI** — coupons must currently be inserted directly
  into the `coupons` table (as the smoke test did). Admin CRUD for
  coupons is explicitly Phase 11's scope ("coupons/promotions" in the
  admin task list).
- **No category/product-restricted coupons** — every active coupon
  applies store-wide. Not called for by any specific requirement so far;
  would need a `coupon_category_restrictions`/`coupon_product_restrictions`
  join table if it becomes a real requirement.
- **No inventory reservation window, still** — carried over from Phase 8;
  a real gateway integration (a genuine gap between "redirected to pay"
  and "verified paid") is what would make a reservation-then-confirm
  flow meaningfully different from today's "decrement at order placement"
  behavior. Revisit if/when a real gateway is wired in.
- Same carried-over gaps as Phase 8: no guest checkout, no `callbackUrl`
  round-trip through `/login`, no `/account/orders` list (Phase 10).
- See "What was *not* verified" above.



## Architecture Decisions

(Cumulative — Phase 7 additions only; see git history for Phases 0-6.)

- Cart/wishlist client state (`CartProvider`/`WishlistProvider`) is
  fetched client-side via Server Actions used as reads, not server-side
  in the root layout, for the same static-rendering reason Phase 6
  documented for `useSession()`. Every mutation still independently
  resolves and authorizes the cart/user server-side — this is a
  presentation-layer choice only, not a security shortcut.
- A guest cart's identity is its own database `id`, issued as an
  HttpOnly cookie — no separate guest-token column/table.
- Cart line items store no price/stock snapshot; totals are always
  recomputed live from `product_variants`. Order snapshots (Phase 8) are
  a deliberately different, later concept.
- Wishlist has no guest-persistence table at all — a signed-out
  wishlist toggle is explicitly local-only/non-persisted UI state, not a
  fake write.

- Auth = NextAuth v5, Credentials + JWT, no adapter. See Phase 6
  write-up above and `src/lib/auth/config.ts`'s header comment for full
  reasoning.
- Session read for UI purposes (Header) happens client-side via
  `useSession()`, not server-side in the root layout, to preserve static
  rendering of content pages. Protected routes/mutations still use
  real, server-side `auth()` checks — this is a presentation-layer
  choice only.
- Mobile number, not email, is the canonical account identifier,
  normalized to `+98XXXXXXXXXX` at both the validation layer (Zod
  preprocessing) and the domain layer (defense in depth, see the bug
  fix above) — never trust a single layer to have normalized correctly.
- `role` is a Postgres enum on `users`, not a boolean, per
  TRENDS_PROJECT_CONTEXT.md §7 — unused until Phase 11 but the schema
  cost of adding it now vs. migrating later favored doing it now.
- Password reset tokens are single-use, short-lived (30 min), and only
  their hash is ever persisted — mirrors the `passwordHash` principle.

- Orders/order items are **full immutable snapshots**, never FKs to
  live `addresses`/`product_variants` rows for anything the customer
  saw at checkout — the opposite tradeoff from `cart_items` (Phase 7),
  which deliberately snapshots nothing and always reads live. This is a
  deliberate, phase-appropriate split: a cart is "what would this cost
  right now," an order is "what did this cost when it was placed."
- Inventory decrement happens via a single conditional `UPDATE ... WHERE
  stock >= quantity`, not a read-then-write pair — the conditional
  `WHERE` clause (checked via Postgres's row-level locking during the
  transaction) is what prevents overselling under concurrency, not
  apparent good timing. Verified under a real simultaneous race (see
  Phase 8's "Tests/checks").
- The order lifecycle is a Postgres enum with states beyond what's
  reachable yet (`paid`/`processing`/`shipped`/`delivered`/`refunded`
  are all unreachable this phase) — modeled fully now so Phase 9/10 add
  behavior, not columns.
- Shipping methods live in a small typed config module, not a database
  table, since they're static business configuration at this store's
  current scale — promotable to a table later without touching any call
  site if admin-editable shipping methods become a real requirement.
- The payment-provider boundary is one function
  (`getPaymentProvider()`) returning one interface
  (`PaymentProvider`) — call sites never branch on "is a real gateway
  configured" themselves, so Phase 9 adding a real adapter is a
  contained change inside that one function.
- Checkout is a single page/route, not a multi-step wizard — a
  deliberate scope/complexity choice appropriate to this store's size,
  not a requirement from TRENDS_PROJECT_CONTEXT.md (which describes
  checkout's steps as logical sections, not mandated separate routes).

- Coupon usage-limit/per-customer-limit enforcement counts real rows in
  `coupon_redemptions`, never a counter column on `coupons` — a counter
  can drift from reality under a crash mid-transaction; counting rows
  inside the same transaction that's already `FOR UPDATE`-locking the
  coupon cannot.
- `validateCoupon` accepts either the plain `db` or a transaction handle
  (typed via `DbTransaction`, exported from `db/client.ts`) rather than
  being two separate functions — one preview-mode, one authoritative —
  because the actual validation rules must be identical in both places;
  duplicating them would risk the two drifting apart.
- `payments` intentionally allows multiple rows per order (one per
  attempt) rather than one row updated in place — history of a failed
  attempt followed by a successful retry is real reconciliation-relevant
  data (§5), not noise to overwrite.
- `finalizePaymentVerification`'s idempotency comes from `FOR UPDATE`
  row-locking plus a `WHERE status = 'pending'` conditional transition —
  the same "let the database provide the guarantee" principle Phase 8
  used for stock decrement, applied here to "a duplicate callback must be
  a no-op," not "a duplicate callback must be prevented from arriving,"
  since the latter isn't something a callback endpoint can control.
- The mock payment provider deliberately mimics a *specific* real
  gateway's shape (ZarinPal's Authority/Status redirect pattern) rather
  than an abstract/generic one, so that swapping in a real adapter later
  is a matter of replacing `verify()`'s internals with a real HTTP call,
  not redesigning the callback route or the `payments` schema.

## Important Assumptions

- Password-based auth (mobile + password) was chosen as this phase's
  primary mechanism, not OTP/passwordless, since no SMS provider exists
  to send OTPs with yet (rule A.17/A.18). The architecture doesn't
  preclude adding OTP later (`mobileVerified` and the notification
  adapter boundary already exist for it).
- New accounts default to `role: "customer"` and are immediately signed
  in on registration, with no email/mobile verification gate — see
  "Known limitations" above.
- `.env.local`'s `AUTH_SECRET` and `DATABASE_URL` are sandbox-local dev
  values, not production secrets.
- Wishlist persistence is deliberately authenticated-only (no guest
  wishlist storage) — a design choice, not an oversight; see Phase 7's
  write-up.
- The guest cart cookie is a plain (non-signed) random `uuid` used as a
  bearer token, the same trust model already used for password-reset
  tokens' underlying randomness — considered acceptable since a cart
  isn't a secret the way a session token or reset token is; worth
  revisiting only if abuse (e.g. cart-id enumeration) becomes a real
  concern.

- **Checkout requires a signed-in customer — no guest checkout exists.**
  See Phase 8's "Known limitations" for the full reasoning (the address
  book has been auth-only since Phase 6; a guest-order model is separate
  scope).
- Shipping methods, fees, and the free-shipping threshold are
  placeholder business values typical of an Iranian store, not sourced
  from a real contracted courier — flagged for the operator to replace
  before launch (rule A.18).
- Stock is decremented at order-placement time, not reserved earlier and
  confirmed later around a payment redirect — the simplest correct
  behavior given no live payment provider exists yet to create a
  meaningful gap between "placed" and "paid." Revisit once Phase 9 wires
  in a real gateway.
- No coupon/discount logic exists at checkout yet (`orders.discountToman`
  is schema-ready but always `0`) — Phase 9's scope.

- **`PAYMENT_PROVIDER` is unset by default in `.env.example`** — a real
  deployment stays on the honest `NotConfiguredPaymentProvider` until an
  operator deliberately sets up a real gateway. `PAYMENT_PROVIDER=mock`
  is a session/testing convenience, not a recommended default anywhere
  outside development.
- **`perCustomerLimit` defaults to `1`** at the schema level (not
  `null`/unlimited) — a sensible default for typical promo-code use
  (one redemption per customer) that an admin can override per-coupon
  once Phase 11 builds the admin UI to do so; there is currently no way
  to change it except a direct database write.
- Coupons apply store-wide with no category/product restriction — no
  documented requirement called for scoping them narrower yet.

## Known Issues / Technical Debt

(Cumulative — see Phase 5's write-up for pre-existing items: `ILIKE`
search vs. full-text, category OG images, `Product` JSON-LD currency
code; Phase 6's write-up for auth items: console-log notification stub,
no rate limiting yet, header session lag, `mobileVerified` unset.
Phase 7 adds:)

- A cart line's persisted `quantity` can exceed live stock between
  reads; display/totals always self-correct on read but the raw row can
  look stale (see Phase 7 write-up's "Known limitations").
- No optimistic UI updates for cart/wishlist mutations yet (round-trip
  wait on every click).
- **Real browser/Server-Action-wire-protocol verification of
  add-to-cart/wishlist-toggle has not been done** — only direct-to-domain
  and HTTP-GET-level verification (see Phase 7's "Tests/checks" for
  exactly what was and wasn't covered).

Phase 8 adds:

- **No guest checkout** — signed-in only (see "Important Assumptions").
- **No `callbackUrl` from `/checkout` back through `/login`** — manual
  navigation back to checkout after signing in.
- **No coupon application at checkout** — Phase 9.
- **No `/account/orders` order-history list** — Phase 10. Only
  `/order/[orderNumber]` (direct/known-number access) exists so far.
- Shipping methods/fees/threshold are placeholder business values —
  replace before launch.
- No inventory reservation window — stock decrements at order placement,
  not reserved-then-confirmed around a payment redirect (fine with no
  live gateway yet; revisit with Phase 9).
- Order status is permanently stuck at `pending_payment` — expected;
  nothing advances it yet (Phase 9/10's job).
- **Real browser/`Next-Action`-wire-protocol verification of
  `placeOrderAction` itself has not been done** — see Phase 8's
  "Tests/checks" for exactly what was verified instead (direct-to-domain
  business logic + real-cookie HTTP-level page/redirect/ownership
  checks).

Phase 9 adds:

- **No real payment gateway configured** — by design (rule A.17); only
  the mock provider exists. Replacing it with a real adapter is Phase 9's
  work whenever real credentials are available (not scheduled as a
  numbered phase — see CLAUDE_BUILD_INSTRUCTIONS.txt's phase list, which
  doesn't allocate a separate phase to this).
- **No coupon admin UI** — coupons are database-rows-only right now;
  Phase 11's job.
- **No category/product-restricted coupons** — every coupon is store-wide.
- **No inventory reservation window, still** — same reasoning as Phase 8;
  revisit once/if a real gateway creates a meaningful placed-vs-paid gap.
- **Real browser/`Next-Action`-wire-protocol verification of
  `previewCouponAction`/`placeOrderAction`/`retryPaymentAction`, and of
  the full coupon-apply → place-order → mock-gateway → callback →
  confirmation round trip, has not been done** — same sandbox limitation
  (no browser automation tool available) as Phases 7 and 8; see this
  phase's "Tests/checks" for exactly what direct-to-domain and
  real-`curl` HTTP-level verification was done instead.
- Carried over, still outstanding: guest checkout doesn't exist, no
  `callbackUrl` round-trip through `/login`, no `/account/orders` list
  (Phase 10), real browser Server Action verification for cart/wishlist
  actions (Phase 7) and for checkout/order-placement actions (Phase 8).

## Next Session Instructions

- **Exact next objective: PHASE 10 — Orders + fulfillment + customer
  lifecycle**, per CLAUDE_BUILD_INSTRUCTIONS.txt §D. Phase 9 is
  COMPLETE — do not redo coupon/payment work; build order history,
  status transitions, and fulfillment on top of it.
  1. **First, if browser automation is available in this session's
     environment, do the real end-to-end verification Phases 7, 8, and 9
     could not:** in an actual rendered browser, add an item to cart, go
     through `/checkout` (apply a real coupon code, pick a shipping
     method, click "ثبت سفارش"), land on the mock gateway simulator page,
     click "شبیه‌سازی پرداخت موفق", confirm the redirect lands on
     `/order/[orderNumber]?payment=success` with `paid` status displayed.
     Fix anything genuinely broken before building fulfillment on top of
     it; if no browser automation is available, note that again and
     continue with the direct-to-domain + HTTP-level verification
     approach all three phases have used so far.
  2. Read CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 10 task list and
     TRENDS_PROJECT_CONTEXT.md §6 "Orders" before writing code.
  3. **Order history**: build `/account/orders` (a list of the signed-in
     customer's own orders, ownership-scoped — reuse/extend
     `src/domains/orders/queries.ts`, add a `getOrdersForUser(userId)`-
     style function rather than a bare `getAllOrders`). Link to it from
     the account area.
  4. **Order status timeline**: the `orders.status` enum already has
     `processing`/`shipped`/`delivered`/`cancelled`/`refunded` states
     defined but unreachable — Phase 10 is what should add the actual
     transitions (customer-facing status display + an
     `order_status_history`-style audit trail per
     TRENDS_PROJECT_CONTEXT.md §12's data model list, not yet a table in
     this schema — add it this phase).
  5. **Admin order status transitions**: needs *some* form of
     authorization even though Phase 11 (full admin area) hasn't been
     built yet — either scope this phase's admin mutation narrowly and
     re-home it under Phase 11's admin area later, or coordinate with
     Phase 11's scope so the two don't duplicate work. Use `role`
     (already on `users`, unused until now) to gate it — never a route
     that's merely unlinked from the UI (rule §7 "Admin must not rely on
     hidden UI alone for authorization").
  6. **Cancellation rules**: a customer should be able to cancel their
     own order only from an appropriate status (e.g. `pending_payment` or
     early `paid`/`processing`, not `shipped`/`delivered`) — validate the
     transition server-side against the current status, not against
     whatever the client claims it is.
  7. **Tracking number field + shipment abstraction**: a simple
     `trackingNumber` column (or a small `shipments` table, per §12) is
     enough for this phase — no real carrier API integration is expected
     yet.
  8. **Notification abstraction**: order confirmation/status-change
     notifications need *an* adapter interface (mirrors the
     `PaymentProvider` pattern) even if the only implementation is a
     console-log/no-op stub for now (an SMS/email provider isn't
     configured — rule A.17 applies the same way it did to payments).
  9. Run `typecheck`/`lint`/`build` and verify manually: a customer can
     see their own order history and not anyone else's, a status
     transition is validated against the *current* database status (not
     an arbitrary string from the client), and historical order data
     stays stable even if the underlying product/variant is later
     edited (already true since Phase 8's snapshots — just confirm it
     still holds).
  10. Update `PROGRESS.md` the same way this session did.
- Files/areas to inspect first: `src/domains/orders/queries.ts` (where
  `getOrderForUser` already exists — Phase 10 needs its list-returning
  sibling), `src/lib/db/schema/orders.ts` (the `status` enum — what
  Phase 10 will actually transition through), `src/app/order/[orderNumber]/page.tsx`
  (the existing detail page Phase 10's timeline UI extends).
- Do not start Phase 11 (admin) before Phase 10's fulfillment/lifecycle
  work is done, per CLAUDE_BUILD_INSTRUCTIONS.txt's "do not jump ahead
  multiple phases."

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
  `src/domains/catalog/demo-data.ts`. Does not touch `users`/`addresses`/
  `password_reset_tokens`/`carts`/`orders`/`coupons`/`payments`/etc.
- To exercise the mock payment gateway locally: set `PAYMENT_PROVIDER=mock`
  in `.env.local`, restart the dev/start server, and place an order —
  checkout will redirect to `/payment/mock/[authority]`, a simulator page
  with "success"/"fail" buttons that hit `/api/payments/callback/mock`.

**Local PostgreSQL setup used this session** (Ubuntu 24.04 sandbox with
`apt-get` access — adjust for whatever environment runs the next
session; note the sandbox's Postgres/data does NOT persist between
sessions, only the files in the project directory do):
```
apt-get update
apt-get install -y postgresql postgresql-contrib
service postgresql start
su - postgres -c "psql -c \"ALTER USER postgres PASSWORD 'postgres';\""
su - postgres -c "psql -c \"CREATE DATABASE trends;\""
# then in the project root:
cat > .env.local <<'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trends"
AUTH_SECRET="dev-only-not-for-production-use-a-real-random-secret-32chars"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
EOF
npm run db:migrate
npm run db:seed
```

Toolchain confirmed this session (network was available): Node 22.22.2,
npm 10.9.7, Next.js 16.3.4, React 19.2.8, Tailwind CSS 4.3.3,
ESLint 9.39.5 + eslint-config-next 16.3.4, drizzle-orm ^0.45.2,
drizzle-kit ^0.31.10, postgres (porsager driver, latest), tsx 4.23.13,
PostgreSQL server 16.15, next-auth@beta 5.0.0-beta.32, bcryptjs 3.0.3,
zod 4.6.2. No new dependencies were added in Phase 9 — coupons/payments
used only what was already installed (same as Phases 7 and 8).
