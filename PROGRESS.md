# Trends Progress Report

## Current Status
- Overall status: Reviews/content/support/notifications (Phase 12) is
  implemented **and verified** this session — full network access was
  available. 3 new tables (`reviews`, `newsletter_subscribers`,
  `support_messages`) were migrated against a fresh local Postgres,
  `typecheck`/`lint`/`build` all pass clean, and every new query/action
  module was exercised directly against the real database (including the
  actual exported Server Actions, not just their underlying queries) via
  throwaway verification scripts that were deleted again before
  finishing — see "Tests/checks" below for exactly what ran.
- Current phase: none in progress — PHASE 12 is COMPLETE.
- Last completed phase: PHASE 12 — Reviews, content, support, notifications
- Next phase: PHASE 13 — Security + performance hardening
- Date: 2026-09-15

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

### Phase 10 — Orders + fulfillment + customer lifecycle (COMPLETE)

**New database schema** (`src/lib/db/schema/`):
- `order-status.ts` — `orderStatusEnum` (`pending_payment | paid |
  processing | shipped | delivered | cancelled | refunded`), **extracted
  out of `orders.ts`** (where it originated in Phase 8) into its own leaf
  module. Reason: `orders.ts` needs `orderStatusHistory` (for its
  `relations()` call) and `order-status-history.ts` (new this phase)
  needs `orderStatusEnum` — a genuine two-file cycle, and unlike the
  `order-items.ts`/`orders.ts` cycle that's tolerated since Phase 8 (only
  used inside a *deferred* `relations()` callback), this enum is used
  directly inside `pgTable()` column definitions in *both* files at
  module-evaluation time, which `drizzle-kit generate` confirmed cannot
  resolve as a true circular `require`
  (`ReferenceError: Cannot access 'orderStatusEnum' before
  initialization`). A shared leaf module both import from is the fix.
- `order-status-history.ts` — `order_status_history` table: `orderId`
  (FK, `cascade`), `fromStatus`/`toStatus` (both `orderStatusEnum`,
  `fromStatus` nullable), `actorRole` (new `order_status_actor` enum:
  `customer | admin | system`), `actorUserId` (FK to `users`,
  `onDelete: "set null"` — a system-driven transition has no acting user
  at all, and a row must survive its actor's account later being
  deleted), `note`, `createdAt`. Append-only audit trail — `orders.status`
  itself only ever reflects the *current* state; this table is what lets
  a customer see a timeline and an operator answer "when did this
  change, and who changed it." Written from exactly three places, all
  inside the same transaction as the status update itself: the payment
  callback (Phase 9's `finalizePaymentVerification`, actor `system`),
  `cancelOrderForUser` (actor `customer`), and
  `adminTransitionOrderStatus` (actor `admin`) — so status and history
  can never drift apart.
- `orders.ts` — added `trackingNumber` (plain free-text, not a carrier-API
  integration — Phase 10's task list explicitly calls a simple column
  enough for this phase), `cancelReason`, `cancelledAt` (both set only by
  a transition into `cancelled`, `null` otherwise). Added an
  `ordersRelations.statusHistory` `many()` relation.

**New domain code** (`src/domains/`):
- `orders/lifecycle.ts` — the single source of truth for legal
  `orders.status` transitions, so every caller checks against one table
  instead of trusting a client-submitted status string
  (TRENDS_PROJECT_CONTEXT.md §6 "explicit and validated, not arbitrary
  strings"):
  - `canCustomerCancel(status)` — true for `pending_payment`, `paid`,
    `processing`. Stops at `processing`, not `shipped`, because
    TRENDS_PROJECT_CONTEXT.md has no returns/refund flow for goods
    already in transit yet (that's Phase 12's "return/refund
    architecture"); self-service cancellation intentionally doesn't
    reach into that gap.
  - `getAdminAllowedNextStatuses(status)` / `canAdminTransition(from, to)`
    — the admin transition table. **`paid` is deliberately absent as a
    target anywhere in this table** — the only sanctioned way an order
    becomes `paid` is a verified payment callback
    (`finalizePaymentVerification`, Phase 9), never an admin form, so a
    compromised or careless admin UI can never mark an unpaid order paid.
    `cancelled -> refunded` is the one admin-only transition that follows
    cancelling an already-paid order; per rule A.17 it never calls a real
    gateway refund API, it only records that an operator has manually
    reconciled a refund outside this system.
  - `ORDER_STATUS_LABELS` — the one place Persian status labels live;
    `/order/[orderNumber]`, `/account/orders`, and the new `/admin/orders*`
    pages all import from here instead of each hand-rolling their own copy
    (the customer order page previously had its own inline copy from
    Phase 8/9 — replaced to import this).
- `notifications/provider.ts` — a `NotificationProvider` adapter
  interface (mirrors `payments/provider.ts`'s shape) with
  `ConsoleNotificationProvider` as the only implementation: no SMS/email
  provider is configured (`SMS_PROVIDER_API_KEY` is blank in
  `.env.example`), so per rule A.17 this never pretends to send a real
  message — it logs a clearly-labeled `[notifications] ... is NOT a real
  SMS` line instead. `notifyOrderEvent()` is the wrapper every call site
  uses; it never throws (a notification failure must not roll back or
  block the commerce operation that triggered it). Wired into:
  order confirmation (`createOrderFromCart`, after its transaction
  commits), payment succeeded/failed (`finalizePaymentVerification`,
  after commit), and order cancelled / order status changed
  (`cancelOrderForUser` / `adminTransitionOrderStatus`, after commit).
- `orders/queries.ts` additions:
  - `cancelOrderForUser(orderNumber, userId, reason)` — ownership-scoped
    (takes `userId`, not a bare order id), transactional, re-reads the
    order's *current* status with `SELECT ... FOR UPDATE` and validates
    against `canCustomerCancel` before writing anything — never trusts
    that the UI merely hid the cancel button for an uncancellable order.
    Restocks inventory via `restockCancelledOrderItems` (increments
    `product_variants.stock` back for every line whose `variantId` is
    still non-null — a deleted variant, `onDelete: "set null"`, has
    nothing left to restock onto) inside the same transaction. Throws
    `OrderNotFoundError` (wrong owner or unknown order number, same
    message either way — no ownership-guessing oracle) or
    `InvalidOrderTransitionError`.
  - `adminTransitionOrderStatus(orderNumber, adminUserId, toStatus, {trackingNumber?, note?})`
    — the transactional counterpart for staff/admin, same `FOR UPDATE` +
    `canAdminTransition` re-validation pattern. Sets `trackingNumber` only
    on a transition into `shipped`; sets `cancelReason`/`cancelledAt` and
    restocks only on a transition into `cancelled`. **Authorization
    (`session.user.role`) is not this function's job** — it only enforces
    "is this a legal transition from the real current status," the same
    separation `validateCoupon` uses; the caller
    (`adminTransitionOrderStatusAction`, a Server Action) is what checks
    role.
  - Read helpers: `getOrderStatusHistoryForUser` (ownership-scoped, for
    the customer timeline), `getOrderStatusHistoryForOrder` (not
    ownership-scoped — admin-only, caller checks role),
    `getOrderByOrderNumberForAdmin`, `listOrdersForAdmin` (capped at
    `limit(200)` — a real paginated/filterable admin order list is Phase
    11's scope; this is a real, live, unpaginated-but-capped read, never
    demo data).
  - `EmptyCartError`/`OrderNotFoundError` moved up and
    `InvalidOrderTransitionError` added as a new error class.
- `orders/actions.ts` — added `cancelOrderAction(orderNumber, reason)`
  Server Action (auth check, delegates ownership/legality entirely to
  `cancelOrderForUser`, `revalidatePath`s both the order page and
  `/account/orders`).
- `orders/admin-actions.ts` (new file) — `adminTransitionOrderStatusAction`,
  the **only** place `session.user.role` is checked for this phase's admin
  mutation (`role === "admin" || role === "staff"`) — real server-side
  authorization, not just an unlinked route
  (CLAUDE_BUILD_INSTRUCTIONS.txt §7 "Admin must not rely on hidden UI
  alone for authorization"). Kept in its own file, separate from the
  customer-facing `actions.ts`, so the one admin-authorization check in
  this phase is easy to find and audit.
- `payments/queries.ts` — `finalizePaymentVerification` now also: (a)
  inserts an `order_status_history` row (`pending_payment -> paid`, actor
  `system`) in the same transaction as the `succeeded` branch's order
  update, and (b) sends a `payment_succeeded`/`payment_failed`
  notification after the transaction commits (never for the
  `already_processed`/`not_found` branches, since those made no real
  state change worth notifying about).

**New UI**:
- `/account/orders` (new page) — Phase 10's "order history" task.
  Ownership-scoped list via `listOrdersForUser`, links each row to the
  existing `/order/[orderNumber]` detail page. Closes the gap Phase 8's
  PROGRESS.md documented ("no in-app link to revisit a past order without
  knowing the order number"). Linked from `/account`'s sidebar.
- `/order/[orderNumber]` — added: a status-timeline section (reads
  `getOrderStatusHistoryForUser`), a tracking-number line when present, a
  cancel-reason line when the order is cancelled, and a
  `<CancelOrderButton>` client component (renders only when
  `canCustomerCancel(order.status)` — real enforcement is server-side in
  `cancelOrderForUser`, this is only the conditional render). Refactored
  its previously-inline `STATUS_LABELS` map to import
  `ORDER_STATUS_LABELS` from `lifecycle.ts` instead of duplicating it.
- `/admin` (new route tree, minimal by design — see "Known limitations"):
  - `layout.tsx` — the one place every `/admin/*` route is gated:
    `redirect("/login")` if signed out, `notFound()` (not a redirect) if
    signed in but not `admin`/`staff` — a plain 404 doesn't confirm to a
    curious customer that `/admin` is even a real, protected area, the
    same reasoning `/order/[orderNumber]` already uses for cross-user
    order access.
  - `/admin/orders` — a live, capped, unfiltered order list
    (`listOrdersForAdmin`).
  - `/admin/orders/[orderNumber]` — order detail (items, shipping address,
    tracking number, cancel reason, full status history with actor
    labels) plus `<AdminOrderStatusForm>`, a client component that only
    *renders* the statuses `getAdminAllowedNextStatuses` says are legal
    from the current status (the real enforcement, again, is server-side
    in `adminTransitionOrderStatus` + the role check in
    `adminTransitionOrderStatusAction`).

**Files changed**: `src/lib/db/schema/order-status.ts` (new),
`src/lib/db/schema/order-status-history.ts` (new),
`src/lib/db/schema/orders.ts`, `src/lib/db/schema/index.ts`,
`src/domains/orders/lifecycle.ts` (new),
`src/domains/notifications/provider.ts` (new),
`src/domains/orders/queries.ts`, `src/domains/orders/actions.ts`,
`src/domains/orders/admin-actions.ts` (new),
`src/domains/payments/queries.ts`,
`src/app/account/orders/page.tsx` (new), `src/app/account/layout.tsx`,
`src/app/order/[orderNumber]/page.tsx`,
`src/components/orders/CancelOrderButton.tsx` (new),
`src/app/admin/layout.tsx` (new), `src/app/admin/orders/page.tsx` (new),
`src/app/admin/orders/[orderNumber]/page.tsx` (new),
`src/components/admin/AdminOrderStatusForm.tsx` (new).

**Database changes**: 1 new migration
(`drizzle/migrations/0005_faulty_joseph.sql`) — `CREATE TYPE
order_status_actor`, `CREATE TABLE order_status_history` (2 indexes, 2
FKs), 3 new nullable columns on `orders`
(`tracking_number`/`cancel_reason`/`cancelled_at`). No data migration
needed (all new columns nullable, all existing rows unaffected).

**Environment/config changes**: none — no new environment variables. The
`SMS_PROVIDER_API_KEY` line in `.env.example` (already present from an
earlier phase) is what `notifications/provider.ts`'s header comment
references as "not configured."

**Tests/checks — this session, with full network access**:
- `npx tsc --noEmit` — clean, no errors.
- `npx eslint .` — clean, no warnings.
- `npm run build` — succeeds; `/` (homepage) still statically prerendered
  (unaffected by this phase); new routes `/account/orders`,
  `/admin/orders`, `/admin/orders/[orderNumber]` all correctly appear as
  dynamic (`ƒ`), consistent with every other authenticated/ownership-
  scoped route in the app.
- **Fresh-clone migrate+seed check**: `DROP DATABASE` / `CREATE DATABASE`
  / `npm run db:migrate` (all 6 migrations, including this phase's new
  one, applied cleanly from empty) / `npm run db:seed` (6 categories, 11
  products) — twice during this session, both clean.
- **Direct-to-domain smoke test** (temporary script, deleted after use —
  not part of the deliverable) — 23/23 assertions passed:
  - New order starts `pending_payment`; stock decremented by ordered
    quantity.
  - Customer cancels a `pending_payment` order → status becomes
    `cancelled`, `cancelReason` persisted, **stock restocked back to
    the exact pre-order level**, one `order_status_history` row recorded
    with `actorRole: "customer"`.
  - Cancelling an already-cancelled order → `InvalidOrderTransitionError`.
  - **Ownership**: a different signed-in user attempting to cancel, or
    read the status history of, someone else's order → both correctly
    blocked (`OrderNotFoundError` / empty history) rather than leaking
    any data about the order's existence or status.
  - Full paid lifecycle: `createPendingPayment` +
    `finalizePaymentVerification(verified: true)` → order becomes `paid`;
    admin transitions `paid -> processing -> shipped (with tracking
    number) -> delivered`; the resulting `order_status_history` reads
    back as exactly `paid, processing, shipped, delivered` with the
    `paid` entry's actor `system` and the rest `admin`; tracking number
    persisted.
  - Admin cannot transition a `delivered` order backward to `processing`
    (`InvalidOrderTransitionError`) — the transition table has no exit
    from `delivered`.
  - Customer cannot self-cancel a `delivered` order.
  - **Admin cannot forge a transition directly to `paid`** — passing
    `"paid"` as the target status to `adminTransitionOrderStatus` throws
    `InvalidOrderTransitionError`, confirming the domain layer rejects
    this regardless of what any UI would ever render (only the payment
    callback may set `paid`).
  - **Genuine concurrency race**: two simultaneous
    `cancelOrderForUser` calls against the *same* order via
    `Promise.allSettled` — exactly one resolved, one rejected (the
    `SELECT ... FOR UPDATE` lock serializes the second call behind the
    first, which then sees the already-`cancelled` status and correctly
    rejects rather than racing it); stock was restocked by exactly one
    order's worth, not double-applied.
  - `listOrdersForUser`/`listOrdersForAdmin` sanity checks.
  - All test rows (3 users, all their orders/order_items/payments via
    cascade) deleted afterward; the shared test variant's stock was
    explicitly reset to its pre-test baseline and re-verified via
    `SELECT`. Confirmed via a follow-up run against a freshly-reseeded
    database that the script leaves `users`/`orders` at exactly `0` rows
    on its own — genuinely self-contained, not reliant on the
    `DROP DATABASE` reset to hide leftover state.
- **HTTP-level checks** against `npm run start`, using **real NextAuth
  session cookies** (via `/api/auth/csrf` → `/api/auth/callback/credentials`)
  for a `customer`-role user and a separate `admin`-role user:
  - `GET /admin/orders` / `GET /account/orders` signed out → `307` to
    `/login`.
  - `GET /admin/orders` as a signed-in **customer** (non-staff) → `404`
    — confirms role-gating is real server-side enforcement, not merely
    an unlinked route, satisfying Phase 10's "unauthorized admin access"
    concern one phase early (full coverage is Phase 14's test list item).
  - `GET /admin/orders` as a signed-in **admin** → `200`.
  - `GET /account/orders` as the order-owning customer → `200`, page
    genuinely contains that customer's real order number.
  - `GET /order/[orderNumber]` as the owning customer → `200`, page
    contains the real order number and a rendered "لغو سفارش" (cancel)
    button (order was `pending_payment`, a cancellable status).
  - `GET /order/[orderNumber]` for that same order as a **different**
    logged-in customer → `404` — cross-user ownership still enforced.
  - `GET /admin/orders` as admin → page lists **both** test orders
    (across two different customers), confirming this is a real,
    unscoped admin read.
  - `GET /admin/orders/[orderNumber]` as admin → `200`, renders "تغییر
    وضعیت سفارش" (change order status) and the transition `<select>`
    contains only the one legal next status (`cancelled`) for a
    `pending_payment` order — confirming `getAdminAllowedNextStatuses`
    correctly narrows the rendered options per order.
  - All test users/addresses/carts/orders created for this pass removed
    by resetting the database (`DROP DATABASE`/`CREATE DATABASE`/migrate/
    seed) back to the clean seeded baseline this report leaves the
    project in.
- **What was *not* verified this session, and why:** same category of gap
  Phases 7-9 already documented — no browser-automation tool available in
  this sandbox, so `cancelOrderAction`/`adminTransitionOrderStatusAction`
  were not driven through a real browser's `Next-Action` RSC wire call.
  Every piece of business logic those actions call was verified directly
  (the smoke test above), and their surrounding HTTP/auth/redirect/role-
  gating/rendering behavior was verified via real cookie-based `curl`
  requests (above) — what's specifically missing is watching an actual
  rendered browser click the "لغو سفارش" button or the admin status-
  transition form and observing the resulting `router.refresh()`. A
  session with browser automation available should do this once, and
  should also close out the same-category gap already carried over from
  Phases 7-9.

**Known limitations / follow-ups (not blocking, documented rather than
silently ignored):**
- **The `/admin` area is intentionally minimal** — just enough to satisfy
  this phase's own acceptance criterion ("Admin can operate an order
  safely"): a plain unstyled-relative-to-the-storefront order list and
  detail page, no dashboard, no nav beyond a single "سفارش‌ها" link. A
  real admin dashboard/nav/products/customers/coupons/reviews CRUD is
  explicitly Phase 11's scope (CLAUDE_BUILD_INSTRUCTIONS.txt Phase 11
  "Admin/operations") — `/admin/orders*` and
  `orders/admin-actions.ts` are meant to be absorbed into that work, not
  duplicated by it.
- **`listOrdersForAdmin` is unpaginated-but-capped (`limit(200)`), with no
  filtering/search.** Fine for this phase's scope; a real filterable,
  paginated admin order list is Phase 11's job.
- **No refund-money integration.** `cancelled -> refunded` (admin-only)
  only records that an operator has manually reconciled a refund outside
  this system — per rule A.17, nothing here calls any real payment
  gateway refund API. If a future phase adds a live gateway with a real
  refund endpoint, this transition is where that call would eventually
  be wired in.
- **No returns/exchange flow for delivered goods** — out of scope for
  Phase 10 by design (`canCustomerCancel` stops at `processing`); that's
  Phase 12's "return/refund architecture."
- **No email/SMS provider is actually configured** — by design, per rule
  A.17. `ConsoleNotificationProvider` exercises every call site's shape;
  a real SMS/email adapter is a contained addition inside
  `getNotificationProvider()` whenever real provider credentials exist.
- **No customer-facing UI for order search/filtering** in `/account/orders`
  — it's a plain reverse-chronological list. Not called for by any
  specific requirement so far.
- Same carried-over gaps as Phases 8-9: no guest checkout, no
  `callbackUrl` round-trip through `/login`.
- See "What was *not* verified" above.


### Phase 11 — Admin/operations (COMPLETE)

**Goal:** make the shop operable without editing code — real admin CRUD
for every catalog/customer/promotion/content/settings surface, with
server-side authorization and audit logging, per
TRENDS_PROJECT_CONTEXT.md §7 and CLAUDE_BUILD_INSTRUCTIONS.txt Phase 11.

**New schema** (`src/lib/db/schema/`, migration
`drizzle/migrations/0006_green_selene.sql`, applied and verified against
a real local Postgres):
- `audit-logs.ts` — general "who did what, when" trail (actor, action,
  entity type/id, JSON payload). Distinct from Phase 10's
  `order_status_history`, which stays the order-specific timeline
  customers/admins see on an order's own page; `audit_logs` is the
  cross-entity admin activity log every mutation this phase adds writes
  to. `actorId` is `onDelete: "set null"` so deleting a staff account
  (not currently even possible from the UI) can never destroy history.
- `hero-slides.ts` / `promo-banners.ts` — homepage promotional content,
  replacing `demo-data.ts`'s hardcoded `demoHeroSlides`/`demoBanners`
  per CLAUDE_BUILD_INSTRUCTIONS.txt §14. No image-upload/URL column yet
  — there is still no object-storage/CDN pipeline (§3), so slides/
  banners keep rendering through `AssetSlot` placeholders exactly as the
  demo fixtures did; only text content, CTA links, ordering, and
  active-state became admin-editable. `src/app/page.tsx` now reads both
  from the DB (`@/domains/content/queries`), and the homepage sections
  simply don't render when empty (no crash on a freshly-migrated,
  unseeded DB).
- `site-settings.ts` — a genuine singleton row (fixed id `"default"`,
  enforced by `getSiteSettings()` in
  `src/domains/admin/settings-queries.ts`, which creates the row with
  defaults on first read if missing). Promotes what was previously
  hardcoded in `src/domains/shipping/methods.ts`
  (`FREE_SHIPPING_THRESHOLD_TOMAN` and per-method fees) to admin-editable
  config — `listShippingMethods`/`getShippingMethod` became `async` as a
  result; both call sites (`src/app/checkout/page.tsx`,
  `src/domains/orders/actions.ts`) already ran inside `async` functions,
  so this was a low-risk, same-file change. Payment provider config is
  deliberately **not** in this table — `/admin/settings` only displays
  which `PAYMENT_PROVIDER` env var is currently set (read server-side,
  never a secret value), per rule A.13/G; changing the real provider
  still requires editing environment config and redeploying.

**New domain code:**
- `src/domains/auth/roles.ts` — shared `isStaffOrAdmin`/`isAdmin`
  predicates and a generic `ActionResult<T>` type, promoted out of
  `orders/admin-actions.ts`'s previously-private `isStaffOrAdmin` per
  this phase's own hand-off instruction. Every admin Server Action added
  this phase imports this instead of redefining its own check.
  `orders/admin-actions.ts` was updated to use it and to additionally
  write to `audit_logs` on every successful status transition.
- `src/domains/analytics/audit.ts` — `recordAuditLog` (write) +
  `listAuditLogs`/`listAuditLogEntityTypes` (paginated read for
  `/admin/audit-log`).
- `src/domains/categories/{queries,actions}.ts` — admin-facing category
  reads (including inactive rows, product counts, parent names) and
  create/update/delete. Delete is blocked with a friendly error if the
  category has children or products (`categoryHasChildrenOrProducts`) —
  the DB's FK constraints would otherwise just throw.
- `src/domains/catalog/{admin-queries,admin-actions}.ts` — admin product
  list (search/category filter/pagination, aggregated variant
  count/total stock/min price), product detail (with variants+images),
  and full CRUD for products/variants/images. Variant SKU and
  size+color-per-product uniqueness are enforced by the DB (the latter
  via the existing `product_variants_product_size_color_idx` from Phase
  3) with a friendly Persian message on conflict, not just an app-level
  check. Product delete is safe by existing schema design —
  `order_items.productId`/`variantId` are `onDelete: "set null"` (Phase
  8), so historical orders keep their own immutable snapshot fields
  regardless of whether the live product still exists.
- `src/domains/inventory/actions.ts` — a single `adjustStockAction`
  (signed delta + reason), not a full `inventory_movements` ledger
  table. Documented in-file why: Phase 8's checkout inventory decrement
  doesn't participate in any ledger either (it updates `stock` directly
  inside the order transaction), so building a ledger only for this one
  admin action would produce a half-populated table arguably worse than
  none. Every adjustment is instead written to the general `audit_logs`
  table with before/after stock and reason — a real, queryable trail
  without a second, parallel inventory-tracking system. The actual
  update is a single conditional
  `SET stock = stock + delta WHERE ... AND stock + delta >= 0` (never a
  read-then-write), so a concurrent checkout decrementing the same
  variant can't be raced into negative stock.
- `src/domains/customers/{queries,actions}.ts` — paginated/searchable
  customer list (search matches mobile/name/email) with order
  count/total spend, detail view with recent orders, and an admin-only
  `updateCustomerRoleAction`. Two guards beyond the plain `isAdmin`
  check: an admin cannot demote themselves, and the last remaining
  staff/admin account in the whole system cannot be demoted to
  `customer` — both verified directly this session (see "Tests/checks").
- `src/domains/promotions/{admin-queries,admin-actions}.ts` — admin
  coupon list (with redemption counts), create/update, and a lightweight
  `toggleCouponActiveAction`. Kept separate from
  `src/domains/promotions/queries.ts`'s `validateCoupon` (Phase 9), which
  remains the only place a discount is ever actually computed/applied.
- `src/domains/content/{queries,actions}.ts` — hero slide / promo banner
  CRUD, plus the active-only reads the homepage uses.
- `src/domains/admin/{dashboard,settings-queries,settings-actions}.ts` —
  dashboard summary aggregate (orders awaiting action, this month's
  revenue, customer count, low-stock count, recent orders) and site
  settings get/update. `settings-queries.ts` intentionally has no `"use
  server"` directive (it exports a synchronous `getPaymentProviderStatus`
  alongside async reads — a `"use server"` file may only export async
  functions, so the mutation went in a separate `settings-actions.ts`).
- `src/lib/validation/admin.ts` — Zod schemas for every new form
  (category/product/variant/image/stock-adjustment/coupon/hero-slide/
  promo-banner/site-settings/customer-role).

**New admin UI** (`src/app/admin/`, `src/components/admin/`):
- `/admin/layout.tsx` rebuilt from Phase 10's minimal "just Orders"
  shell into a real dashboard shell: top bar + `AdminNav` (pill nav to
  every section below) + the same server-side `role !== admin/staff →
  notFound()` gate as before (unchanged reasoning — a 404, not a
  redirect, so a non-staff customer can't even tell `/admin` is a real
  protected area). Every individual page's Server Actions still
  re-check role themselves — the layout gate is defense-in-depth, not
  the only check.
- `/admin` — dashboard summary cards + recent orders.
- `/admin/categories` — table + inline create/edit (toggle per row) +
  delete-with-confirm.
- `/admin/products` (list: search + category filter + pagination),
  `/admin/products/new`, `/admin/products/[id]` (product fields form +
  variants table with inline add/edit/delete + images list with
  add/delete + a top-level delete-product button).
- `/admin/inventory` — every active variant at/below its low-stock
  threshold, with an inline adjust-stock mini-form per row.
- `/admin/orders` — **extended, not duplicated**: `listOrdersForAdmin`
  gained `status`/`search`/pagination parameters (previously an
  unpaginated `limit(200)`, per Phase 10's own hand-off note); the list
  page gained a search box + status filter + page links.
  `/admin/orders/[orderNumber]` is untouched from Phase 10.
- `/admin/customers` (list: search + pagination),
  `/admin/customers/[id]` (profile + recent orders + role-change form,
  the form only rendered at all when the viewer is `admin`, not `staff`).
- `/admin/coupons` (list with an active/inactive toggle button),
  `/admin/coupons/new`, `/admin/coupons/[id]` (full edit form).
- `/admin/content` — hero slides and promo banners, each with an
  inline list/add/edit/delete manager component.
- `/admin/settings` — shipping fees/free-shipping threshold + store
  contact info form, plus a read-only payment-provider status panel.
- `/admin/audit-log` — paginated, entity-type-filterable log viewer with
  Persian labels for every action type this phase's code can produce.
- Shared pieces: `ConfirmButton` (generic confirm-then-run-a-Server-
  Action button, the same `useTransition` + `router.refresh()` shape
  Phase 10's `AdminOrderStatusForm` established, now reused across
  ~6 different delete/toggle flows instead of being redefined per page).

**Tests/checks (this session, full network access):**
- `npm run typecheck` — clean (after fixing two real bugs it caught: a
  `*/` sequence inside a block comment in `shipping/methods.ts` that
  silently broke out of the comment and produced two syntax errors, and
  a type mismatch between `ActionResult` and `ActionResult<unknown>` in
  `ProductForm.tsx`).
- `npm run lint` — clean.
- `npm run build` — succeeds; all 27 routes compile, including every new
  `/admin/*` route (verified via the printed route table). First build
  attempt failed on `/`'s prerender because Postgres had stopped between
  tool calls in this sandbox — restarted, reseeded, rebuilt clean.
- `npm run db:generate` + `npm run db:migrate` — generated and applied
  migration `0006_green_selene.sql` (4 new tables) against a fresh local
  Postgres with zero errors.
- `npm run db:seed` — extended this phase to also populate
  `hero_slides`/`promo_banners` from the same fixtures the homepage used
  to hardcode; ran clean (6 categories, 11 products, 2 hero slides, 2
  promo banners).
- **Direct-to-domain verification** (throwaway `tsx` scripts, written,
  run, and then deleted before finishing — not left in the repo):
  every new query function was called against the real seeded database
  and returned correct data (`listCategoriesForAdmin`,
  `listProductsForAdmin`, `listLowStockVariants`,
  `listCustomersForAdmin`, `listCouponsForAdmin`,
  `listHeroSlidesForAdmin`/`getActiveHeroSlides`,
  `listPromoBannersForAdmin`/`getActivePromoBanners`, `getSiteSettings`,
  `getPaymentProviderStatus`, `getAdminDashboardSummary`,
  `listAuditLogs`/`listAuditLogEntityTypes`, and
  `listShippingMethods` — confirmed the free-shipping threshold logic
  correctly zeroes the standard-method fee above the configured
  threshold and leaves express always-paid). A second script inserted a
  real `admin`-role user directly, exercised `isCategorySlugTaken`,
  `categoryHasChildrenOrProducts`, inserted/queried/deleted a real
  category row, and called `recordAuditLog` against the live
  `audit_logs` table — all correct, and cleanup left the database in
  its pre-test state (verified via `select count(*)` afterward: 0
  users, 6 categories).
- `curl` HTTP-level checks against `npm run start` (no session cookie):
  `/` → 200 with real seeded hero/banner content rendering, `/admin` →
  307 redirect to `/login` (confirms the layout gate fires for a
  genuinely signed-out request, not just a compiled-away branch),
  `/login` → 200, `/category/women` → 200, `/sitemap.xml` → 200.

**Known limitations / not done this session:**
- **Real-browser click-through verification of every new admin form
  (create/edit/delete product, category, coupon, customer role change,
  content, settings) has not been done** — same sandbox limitation (no
  browser automation tool available) every phase since Phase 7 has
  documented; the `Next-Action` wire protocol Server Actions use when
  submitted from a real rendered page (as opposed to a plain HTML
  `<form>` POST or a direct function call) was not exercised end-to-end
  here either. Direct-to-domain + HTTP-level checks above are what
  substituted for it.
- **Newsletter subscribers and reviews/moderation admin screens were
  deliberately not built** — `newsletter_subscribers` and `reviews`
  tables don't exist yet; they're Phase 12 scope per the phase plan
  (§12's task list puts "newsletter real persistence" and "product
  reviews with moderation" under Phase 12, not 11). Building admin UI
  for tables that don't exist would mean either fabricating a table
  Phase 12 should own, or a broken admin page — neither is acceptable
  per rule A.18. The admin nav does not link to either.
- **No real per-movement inventory ledger table** — see
  `inventory/actions.ts`'s header comment for the reasoning; every stock
  adjustment is fully captured in `audit_logs` (before/after
  stock + reason), just not in a dedicated `inventory_movements` table
  with its own schema. A future phase unifying this with checkout's
  decrement path is a documented, real follow-up, not an oversight.
- **Category deletion doesn't cascade-reassign products/subcategories**
  — it's simply blocked (with a clear error) if the category has either.
  An operator has to manually move products/subcategories elsewhere
  first. This matches "prefer the simplest production-safe solution"
  (rule F.1) over building a reassignment UI nobody asked for.
- Carried over, still outstanding from earlier phases: guest checkout
  doesn't exist, no `callbackUrl` round-trip through `/login`, and every
  other real-browser gap documented in Phases 7-10's own "Known
  limitations" sections.

### Phase 12 — Reviews, content, support, notifications (COMPLETE)

**Goal:** product reviews with real moderation and a verified-purchase
marker, the public content pages the storefront was missing (about,
contact, FAQ, shipping/returns/privacy/terms), a real Server Action
behind the contact form and the (previously inert) newsletter form, and
extending the existing notification stub to cover the new review/support
events — per CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 12 task list and
TRENDS_PROJECT_CONTEXT.md §6.

**New schema** (`src/lib/db/schema/`, migration
`drizzle/migrations/0007_colorful_gladiator.sql`, applied and verified
against a real, fresh local Postgres):
- `reviews.ts`: `rating` (1-5, enforced by a real `CHECK` constraint, not
  just Zod), `title`/`body`, `status` (`pending`/`approved`/`rejected`
  Postgres enum — the storefront only ever reads `approved` rows),
  `isVerifiedPurchase`, moderator attribution
  (`moderatedByUserId`/`moderatedAt`/`moderationNote`). One review per
  customer per product enforced by a real `uniqueIndex(userId,
  productId)`, not just an app-level pre-check (rule F.3). **Documented
  assumption** (see the file's header comment): this store only allows a
  review to be submitted at all by a customer who actually purchased the
  product — TRENDS_PROJECT_CONTEXT.md asks for a "verified purchase
  indicator" and "customer ownership checks" but doesn't say whether
  non-purchasers may review; requiring a purchase is the safer, more
  standard reading. `productId`/`userId` both cascade-delete (unlike
  `order_items`, which deliberately preserves history after a
  product/variant is deleted) — a review has no independent meaning once
  either side is gone.
- `newsletter-subscribers.ts`: `email` (unique), `isActive` (admin-only
  unsubscribe/reactivate toggle — there is no self-service unsubscribe
  link yet, since no real outbound email exists to carry one).
- `support-messages.ts`: `name`/`email`/`mobile`/`subject`/`message`,
  optional `userId` (attribution only, never authorization — any visitor,
  signed in or not, can submit), plain boolean `isResolved` (not a
  multi-state enum — matches `hero_slides`/`promo_banners`'s `isActive`
  pattern; nothing in TRENDS_PROJECT_CONTEXT.md asks for a richer
  ticket lifecycle).

**New domain code**, following the exact
`{queries,actions,admin-queries,admin-actions}.ts` split every prior
phase's domains use:
- `src/domains/reviews/queries.ts` — `getApprovedReviewsForProduct`
  (public, approved-only, computes the average rating),
  `getUserReviewForProduct` (ownership-scoped — a customer's own review
  regardless of status), `hasUserPurchasedProduct` (the real
  purchase-eligibility check: an `order_items`/`orders` join scoped to
  `userId`+`productId`, counting only `paid`/`processing`/`shipped`/
  `delivered` orders — the same status set `customers/queries.ts`'s
  `totalSpentToman` already treats as real revenue; `pending_payment`/
  `cancelled`/`refunded` don't count).
- `src/domains/reviews/actions.ts` — `submitReviewAction`: resolves the
  product by `slug` server-side (never trusts a client-supplied id),
  re-checks `auth()`, `hasUserPurchasedProduct`, and
  `getUserReviewForProduct` (not just the UI's conditional render), and
  falls back gracefully to the same friendly error if a genuine race
  loses against the unique index.
- `src/domains/reviews/admin-queries.ts` /
  `src/domains/reviews/admin-actions.ts` — `listReviewsForAdmin` (all
  statuses, paginated, status filter), `moderateReviewAction`
  (`isStaffOrAdmin`-gated, writes `status`/moderator attribution, calls
  `recordAuditLog`, sends a `review_approved`/`review_rejected`
  notification to the author). Re-moderating an already-moderated review
  is allowed on purpose (see the file's header comment) — unlike order
  status, there's no specified review moderation state machine here, and
  correcting a mistaken rejection is a normal, low-risk admin action.
- `src/domains/newsletter/{actions,queries,admin-actions}.ts` —
  `subscribeNewsletterAction` (no auth required; re-subscribing an
  unsubscribed email reactivates the same row via `onConflictDoUpdate`,
  not a duplicate insert), `listSubscribersForAdmin`,
  `toggleSubscriberActiveAction` (same shape as Phase 11's
  `toggleCouponActiveAction`).
- `src/domains/support/{actions,queries,admin-actions}.ts` —
  `submitSupportMessageAction` (no auth required; records `userId` when
  the submitter happens to be signed in, purely for admin triage —
  never used for authorization), `listSupportMessagesForAdmin`,
  `toggleSupportMessageResolvedAction`.
- `src/domains/notifications/provider.ts` — **generalized** from
  order-only (`OrderNotificationEvent`/`notifyOrderEvent`) to
  `NotificationEvent`/`notifyEvent`, adding `review_approved`/
  `review_rejected` (sent to the reviewing customer's `mobile`, same
  shape as `order_status_changed`) and `support_message_received`
  (store-facing — carries `recipient: "store"` instead of a customer
  `mobile`). Both pre-existing call sites (`orders/queries.ts`,
  `payments/queries.ts`) were updated to the new name; the interface/provider
  shape itself (still a console-log stub — `SMS_PROVIDER_API_KEY` is
  unset, per rule A.17) did not change. This was the explicit approach
  the Phase 11 handoff asked for: "extend the existing stub ... if it
  fits the existing interface cleanly; don't invent a second
  notification system."

**New routes/pages:**
- `/about`, `/faq`, `/contact` (real Server Action-backed support form,
  `ContactForm.tsx`, plus the store's support email/phone from
  `site_settings` when set), `/shipping-policy` (reads live
  `standardShippingFeeToman`/`expressShippingFeeToman`/
  `freeShippingThresholdToman` from `site_settings` rather than
  hardcoding numbers that could drift from Phase 8's real shipping
  config), `/returns-policy`, `/privacy-policy`, `/terms` — all with real
  `title`/`description`/`alternates.canonical` metadata and added to
  `sitemap.ts`. Every policy page's body includes a one-line disclosure
  that the copy is generic boilerplate needing real legal review before
  launch (see "Important Assumptions" below) — not left unstated.
- `/admin/reviews` (status-filterable moderation queue,
  `ReviewModerationRow.tsx` — approve/reject inline with an optional
  note), `/admin/newsletter` (subscriber list + active/unsubscribed
  toggle), `/admin/support` (submission list + unresolved filter +
  resolve toggle). All three added to `AdminNav.tsx` and to
  `AdminDashboardSummary`/`/admin`'s summary cards (pending-review count,
  unresolved-support-message count), alongside the existing
  orders/revenue/customers/low-stock cards.
- Product detail page (`/product/[slug]`): new `ReviewsSection` —
  approved reviews + average rating (always visible), plus, for a
  signed-in customer, either their own review's moderation status or a
  submission form (`ReviewForm.tsx`), decided by the same real
  server-side reads the Server Action itself re-checks, not a client
  guess. A signed-out visitor sees a sign-in prompt instead of the form.
  `Product` JSON-LD gained an `aggregateRating` block, present only when
  there's at least one approved review (schema.org's own guidance —
  never fabricate a rating from zero reviews).
- `Footer.tsx`: the newsletter form (presentational-only since Phase 2)
  is now `NewsletterForm.tsx`, wired to `subscribeNewsletterAction`. The
  footer's four `#site-footer` dead anchor links were replaced with real
  routes to `/about`, `/contact`, `/faq`, plus four more
  (`/shipping-policy`, `/returns-policy`, `/privacy-policy`, `/terms`)
  that didn't have footer links before.

**Files changed/added this session:**
```
src/lib/db/schema/reviews.ts                              (new)
src/lib/db/schema/newsletter-subscribers.ts                (new)
src/lib/db/schema/support-messages.ts                      (new)
src/lib/db/schema/index.ts                                 (edited — 3 new exports)
drizzle/migrations/0007_colorful_gladiator.sql              (new, generated)
drizzle/migrations/meta/*                                   (new, generated)
src/lib/validation/storefront.ts                            (new — review/newsletter/contact Zod schemas)
src/lib/validation/admin.ts                                 (edited — reviewModerationSchema)
src/domains/notifications/provider.ts                       (edited — generalized event union + renamed function)
src/domains/orders/queries.ts                                (edited — notifyOrderEvent -> notifyEvent call sites)
src/domains/payments/queries.ts                               (edited — same rename)
src/domains/reviews/queries.ts                               (new)
src/domains/reviews/actions.ts                               (new)
src/domains/reviews/admin-queries.ts                         (new)
src/domains/reviews/admin-actions.ts                         (new)
src/domains/newsletter/actions.ts                            (new)
src/domains/newsletter/queries.ts                            (new)
src/domains/newsletter/admin-actions.ts                      (new)
src/domains/support/actions.ts                               (new)
src/domains/support/queries.ts                               (new)
src/domains/support/admin-actions.ts                         (new)
src/domains/admin/dashboard.ts                               (edited — pendingReviewCount/unresolvedSupportMessageCount)
src/components/catalog/StarRating.tsx                        (new)
src/components/catalog/ReviewForm.tsx                        (new)
src/components/catalog/ReviewsSection.tsx                    (new)
src/components/admin/ReviewModerationRow.tsx                 (new)
src/components/admin/SubscriberActiveToggle.tsx               (new)
src/components/admin/SupportMessageResolvedToggle.tsx         (new)
src/components/admin/AdminNav.tsx                             (edited — 3 new nav entries)
src/components/layout/NewsletterForm.tsx                      (new)
src/components/layout/Footer.tsx                              (edited — real NewsletterForm + real links)
src/components/support/ContactForm.tsx                        (new)
src/app/product/[slug]/page.tsx                               (edited — ReviewsSection + aggregateRating)
src/app/admin/page.tsx                                        (edited — 2 new dashboard cards)
src/app/admin/reviews/page.tsx                                (new)
src/app/admin/newsletter/page.tsx                             (new)
src/app/admin/support/page.tsx                                (new)
src/app/about/page.tsx                                        (new)
src/app/faq/page.tsx                                          (new)
src/app/contact/page.tsx                                      (new)
src/app/shipping-policy/page.tsx                              (new)
src/app/returns-policy/page.tsx                               (new)
src/app/privacy-policy/page.tsx                               (new)
src/app/terms/page.tsx                                        (new)
src/app/sitemap.ts                                             (edited — 7 new static-page entries)
```

**Tests/checks — all run this session, full network access available:**
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `npm run build` — clean; all 7 new static pages prerender as `○`
  (static) and every new admin/dynamic route lists as `ƒ` (dynamic), as
  expected for pages behind the `/admin` role gate or reading
  per-request state.
- **Fresh-clone migrate+seed cycle**: created a brand-new
  `trends_fresh` database, ran `drizzle-kit migrate` against it from
  the very first migration through `0007_colorful_gladiator.sql`, then
  `npm run db:seed` — both succeeded, and `\dt` confirmed all 24 tables
  exist including the 3 new ones. Dropped afterward.
- **Direct-to-domain smoke test** (temporary script, deleted after):
  15 real-database assertions, including: a `paid` order makes
  `hasUserPurchasedProduct` true, a `pending_payment` order does **not**
  (the real DB row, not a mock); a newly-submitted review defaults to
  `pending` and is invisible in `getApprovedReviewsForProduct` until
  approved, then visible with a correct average rating; a second review
  by the same user for the same product is genuinely rejected by the
  Postgres unique index (not just app logic — the actual `23505` error
  was captured); a `rating: 6` insert is genuinely rejected by the
  `CHECK` constraint; newsletter re-subscribe reactivates the same row
  instead of duplicating; the unresolved-support-message count
  increments/decrements correctly around insert/resolve.
- **Server Action-level smoke test** (temporary script, deleted after):
  called the actual exported `subscribeNewsletterAction` and
  `submitSupportMessageAction` functions (not reimplemented logic) with
  real `FormData` — confirmed invalid email is rejected by the real
  action, a valid (messy-cased/whitespaced) email is normalized and
  persisted, and an empty required `subject` is rejected by
  `submitSupportMessageAction`'s real validation. A full successful
  `submitSupportMessageAction` call (which internally calls `auth()`,
  reading `next/headers`) could not be completed outside a live HTTP
  request scope — this is the same documented Next.js Server Action
  limitation every phase since Phase 7 has carried forward, not a new
  gap; the insert path itself was already verified directly against the
  DB in the smoke test above, and the HTTP check below confirms
  `/contact` itself renders and is reachable.
- **HTTP-level checks** (`curl` against a real `next dev` server):
  `/`, `/about`, `/contact`, `/faq`, `/shipping-policy`,
  `/returns-policy`, `/privacy-policy`, `/terms` → all 200.
  `/admin`, `/admin/reviews`, `/admin/newsletter`, `/admin/support` (no
  session cookie) → all 307 redirecting to `/login` (confirms the
  existing role-gate layout fires for these new routes too, not just a
  compiled-away branch). `/sitemap.xml` → confirmed all 7 new static
  pages present as `<loc>` entries. `/product/classic-shirt` → confirmed
  the reviews section renders (sign-in prompt for a signed-out visitor,
  "no reviews yet" empty state, and `aggregateRating` correctly absent
  from the page's JSON-LD since the product has zero approved reviews).
- Database reset to a clean seeded baseline before finishing (per this
  project's "clean baseline before delivery" convention) — confirmed
  `reviews`/`newsletter_subscribers`/`support_messages`/`users`/`orders`
  all `0` rows in the delivered dev database except the catalog seed
  data itself; one leftover test row from an earlier failed smoke-test
  run was caught and deleted manually before the final count check.

**Known limitations / not done this session:**
- **Real-browser click-through verification of the review/newsletter/
  contact forms as actually submitted by a rendered page (the
  `Next-Action` wire protocol) has not been done** — same sandbox
  limitation every phase since Phase 7 has documented; no browser
  automation tool is available. Direct-to-domain + Server-Action-level +
  HTTP-level checks above are what substituted for it.
- **No self-service newsletter unsubscribe link** — `isActive` can only
  be toggled by an admin from `/admin/newsletter`. There is no real
  outbound email system yet to carry a one-click unsubscribe link (see
  `notifications/provider.ts`'s console-only stub); building a
  self-service unsubscribe *route* without a way to actually email
  people a link to it would be a half-feature, so it was left as an
  admin-only toggle rather than half-built.
- **No customer-facing "my support messages" or "edit/delete my review"
  views** — a customer can submit a review or a support message but has
  no page listing their own past submissions afterward, beyond the
  product page showing "your review is pending/rejected" for that one
  product. Not called for anywhere in TRENDS_PROJECT_CONTEXT.md's
  feature scope; can be added later if requested.
- **Policy page copy (`/shipping-policy`, `/returns-policy`,
  `/privacy-policy`, `/terms`) is genuine but generic boilerplate**, not
  legally reviewed for this specific business — each page says so
  explicitly in its own body text. Per rule A.18 ("do not silently
  invent business requirements that materially affect ... legal
  policy"), this is flagged here rather than presented as finished legal
  copy.
- Carried over, still outstanding from earlier phases: guest checkout
  doesn't exist, no `callbackUrl` round-trip through `/login`, no real
  per-movement inventory ledger table, category deletion doesn't
  cascade-reassign, and every other real-browser gap documented in
  Phases 7-11's own "Known limitations" sections.


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

- `order_status_history` is append-only and the single source of truth
  for "when did this order's status change, and who changed it" —
  `orders.status` itself is only ever the current value. Every writer
  (the payment callback, `cancelOrderForUser`,
  `adminTransitionOrderStatus`) inserts its history row inside the exact
  same transaction as the status update, so the two can never drift.
- The legal-transition table (`orders/lifecycle.ts`) is a plain
  in-memory `Record`, not a database table — transitions are fixed
  business logic, not admin-configurable data, so a typed module (one
  file, one export, every caller imports the same table) is the simplest
  correct choice, same reasoning Phase 8 used for shipping methods.
  `paid` is deliberately unreachable as an admin-transition *target* —
  only the verified-payment callback may ever set it.
- Order cancellation restocks inventory via the same "let a conditional
  SQL statement provide the guarantee" principle Phase 8 established for
  the original decrement — here an unconditional `+= quantity` inside
  the same transaction that flips status to `cancelled`, which is safe
  specifically because it's guarded by that transaction's own
  `SELECT ... FOR UPDATE` on the order row (a concurrent second
  cancel attempt on the same order blocks until the first commits, then
  sees the already-`cancelled` status and is rejected before it can
  restock a second time — verified under a real race, see this phase's
  "Tests/checks").
- The notification-provider boundary (`notifications/provider.ts`)
  mirrors the payment-provider boundary exactly on purpose — one
  function (`getNotificationProvider()`) returning one interface, so a
  future real SMS/email adapter is a contained change inside that one
  function, not a rewrite of every order-lifecycle call site.
- The Phase 10 admin surface (`/admin/orders*`) is deliberately not
  folded into a `/admin` dashboard shell with a real nav — Phase 11 owns
  building that shell; this phase's `layout.tsx` is intentionally the
  minimum needed to make its own single feature (order fulfillment)
  safely reachable, so Phase 11 replaces this layout rather than
  extending around it.

### Phase 11 additions
- `audit_logs` (general) and `order_status_history` (Phase 10,
  order-specific) are kept as two separate tables rather than merging —
  see `audit-logs.ts`'s header comment. An order-status transition now
  writes to both.
- Inventory stock adjustments are audited via `audit_logs`, not a
  dedicated `inventory_movements` ledger — see
  `inventory/actions.ts`'s header comment for why a half-populated
  ledger (checkout's own decrement still doesn't use one) would be worse
  than this. Documented as a real follow-up, not an oversight.
- `site_settings` is a genuine singleton (one fixed-id row), not a
  generic key/value settings table — simpler for the small, fixed set of
  fields this phase actually needed (shipping fees/threshold, store
  contact info), per rule F.5.
- Payment provider configuration status is read-only in the admin UI
  (`process.env.PAYMENT_PROVIDER`, server-side only) — never stored in
  `site_settings`, never editable from a form, per rule A.13/G.
- `hero_slides`/`promo_banners` have no image-upload field yet —
  content stays text/link/ordering-only until a real object-storage/CDN
  pipeline exists (§3, still not built); adding an `imageUrl` column
  later is a small additive migration, not a redesign.
- A `"use server"` file may only export async functions — this forced
  `site settings` reads (`getSiteSettings`, and the synchronous
  `getPaymentProviderStatus`) into a plain `settings-queries.ts` module
  and the one actual mutation into a separate `settings-actions.ts` with
  the directive. The same read/action file split is used everywhere else
  admin queries and admin mutations live in already-separate files
  (`admin-queries.ts` + `admin-actions.ts` per domain).

### Phase 12 additions
- `reviews.status` (`pending`/`approved`/`rejected`) is the single source
  of truth for what the storefront shows — same "one authoritative status
  column, never inferred" discipline `orders.status` established in
  Phase 8/10. `getApprovedReviewsForProduct` is the *only* public read
  path; a `pending`/`rejected` review is never exposed to anyone but its
  own author and admins.
- The notification event union was renamed/generalized
  (`OrderNotificationEvent`/`notifyOrderEvent` →
  `NotificationEvent`/`notifyEvent`) rather than adding a second parallel
  notification system for review/support events — extending one existing
  interface was both simpler and exactly what the Phase 11 handoff asked
  for. The provider itself (console-log stub, no real SMS/email
  configured) did not change shape.
- `newsletter_subscribers`/`support_messages` are both simple, mostly-flat
  tables (one boolean lifecycle flag each) rather than richer
  ticket/campaign schemas — TRENDS_PROJECT_CONTEXT.md's §12 data-model
  list calls for exactly these two tables with no further detail, and
  rule F.5 prefers the simplest schema that fully represents the actual
  requirement.
- `/shipping-policy` reads its numbers live from `site_settings`
  (`standardShippingFeeToman`/`expressShippingFeeToman`/
  `freeShippingThresholdToman`) instead of hardcoding them a second time
  — so an admin changing shipping fees from `/admin/settings` (Phase 11)
  can't silently make this policy page display stale numbers.


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

- **Customer self-service cancellation stops at `processing`** — once an
  order is `shipped`/`delivered`, a customer can no longer cancel it
  themselves through this phase's UI/action. TRENDS_PROJECT_CONTEXT.md
  has no returns/refund flow specified for goods already shipped (that's
  explicitly Phase 12's "return/refund architecture"), so this is a
  deliberate scope boundary, not an oversight.
- **`refunded` is a record-keeping status only** — transitioning an order
  to `refunded` does not call any payment gateway and does not move any
  real money; it exists so an operator can mark, in the audit trail, that
  a refund for a cancelled paid order was handled manually outside this
  system (rule A.17: never fabricate a live refund integration).
- **`staff` role, not just `admin`, can perform fulfillment transitions**
  — `adminTransitionOrderStatusAction` checks
  `role === "admin" || role === "staff"`. TRENDS_PROJECT_CONTEXT.md's
  §7 describes "role-based permissions" generally without spelling out
  exactly which roles may do what per action; allowing both for order
  fulfillment (as opposed to, say, more sensitive future admin actions)
  was judged the more useful default. Revisit if Phase 11's permission
  model wants finer granularity.
- No SMS/email provider is configured — `notifyOrderEvent` logs to the
  server console instead of sending anything real (rule A.17), same
  posture as the payment provider.

### Phase 11 addition
- Two role-elevation safeguards in `updateCustomerRoleAction` (an admin
  can't demote themselves; the last remaining staff/admin account can't
  be demoted to `customer`) were judged necessary even though neither
  TRENDS_PROJECT_CONTEXT.md nor CLAUDE_BUILD_INSTRUCTIONS.txt explicitly
  asks for them — without them, a single admin mis-click could leave the
  store with zero accounts able to reach `/admin` at all, a failure mode
  worse than the minor inconvenience of the guard. Revisit only if a
  genuine multi-admin operational need conflicts with this.

### Phase 12 addition
- Only a genuine purchaser (a `paid`/`processing`/`shipped`/`delivered`
  order containing the product) may submit a review at all — there is no
  "unverified"/anonymous review path. This is the assumption
  `reviews.ts`'s header comment documents at length; flagged again here
  since it's a real product-behavior decision, not just an implementation
  detail. Revisit if the store ever wants to accept general public
  reviews.
- Policy-page copy (`/shipping-policy`, `/returns-policy`,
  `/privacy-policy`, `/terms`) is genuine, reasonable, Iranian-store-
  appropriate boilerplate, not legally reviewed text — each page says so
  in its own body per rule A.18. Treat as a real to-do before production
  launch, not finished legal content.

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

Phase 10 adds:

- **`/account/orders` list now exists** — the Phase 8/9 gap above is
  closed.
- **`/admin` area is intentionally minimal** — only order fulfillment
  (list + detail + status-transition form). No dashboard, no nav beyond
  one link, no products/customers/coupons/reviews CRUD. Phase 11's job.
- **`listOrdersForAdmin` has no pagination or filtering** — capped at
  `limit(200)`. Fine at this catalog's/order volume's current scale;
  revisit as part of Phase 11's real admin order list.
- **No real refund-money integration** — `refunded` is a manual
  record-keeping status only (see "Important Assumptions").
- **No returns/exchange flow for delivered goods** — Phase 12's job;
  self-service cancellation intentionally stops at `processing`.
- **No SMS/email provider configured** — `ConsoleNotificationProvider`
  logs instead of sending; same posture as the payment provider.
- **Real browser/`Next-Action`-wire-protocol verification of
  `cancelOrderAction`/`adminTransitionOrderStatusAction` has not been
  done** — same sandbox limitation (no browser automation tool
  available) as every phase since Phase 7; see this phase's
  "Tests/checks" for exactly what direct-to-domain and real-`curl`
  HTTP-level (including real role-gated session cookies for both a
  customer and an admin user) verification was done instead.
- Carried over, still outstanding: guest checkout doesn't exist, no
  `callbackUrl` round-trip through `/login`, real browser Server Action
  verification for cart/wishlist actions (Phase 7), checkout/order-
  placement actions (Phase 8), and coupon/payment actions (Phase 9).

Phase 11 adds:

- **No newsletter-subscribers or reviews/moderation admin screens** —
  their tables don't exist yet; both are Phase 12 scope (see this
  phase's write-up's "Known limitations" for the full reasoning). The
  admin nav has no link to either. **Resolved in Phase 12** —
  `/admin/newsletter` and `/admin/reviews` now exist; left here
  unedited as an accurate record of Phase 11's own state.
- **No dedicated `inventory_movements` ledger table** — stock
  adjustments are fully captured in `audit_logs` (before/after stock +
  reason), not a separate per-movement schema; see
  `inventory/actions.ts`'s header comment.
- **Category deletion doesn't cascade-reassign** — it's blocked (with a
  clear error) if the category has children or products; an operator
  must move them manually first.
- **Real browser/`Next-Action`-wire-protocol verification of every new
  admin form (product/variant/image/category/coupon/content/settings/
  customer-role create-edit-delete flows) has not been done** — same
  sandbox limitation (no browser automation tool available) as every
  phase since Phase 7; see this phase's "Tests/checks" for exactly what
  direct-to-domain and real-`curl` HTTP-level verification was done
  instead.

Phase 12 adds:

- **No self-service newsletter unsubscribe link** — `isActive` is
  admin-only-togglable (`/admin/newsletter`); no real outbound email
  system exists to carry a one-click unsubscribe URL, and building an
  unusable half-feature seemed worse than an honest admin-only toggle.
- **No customer-facing "my reviews"/"my support messages" list views** —
  a customer sees their own review's status inline on that one product's
  page only, and has no history view of past support submissions. Not
  requested anywhere in TRENDS_PROJECT_CONTEXT.md's scope.
- **Policy-page copy is genuine but not legally reviewed** — see
  "Important Assumptions" → "Phase 12 addition" above; each affected page
  says so in its own visible body text, not hidden in this file only.
- **Real browser/`Next-Action`-wire-protocol verification of the review
  submission form, the moderation approve/reject buttons, and the
  newsletter/contact forms as actually submitted from a rendered page has
  not been done** — same sandbox limitation as every phase since Phase 7.
  This phase went one step further than most prior phases though: it
  called the actual exported Server Action functions directly (not just
  their underlying query/db logic) with real `FormData`, which caught
  real validation-branch behavior a pure DB-level test wouldn't have —
  see this phase's "Tests/checks" ("Server Action-level smoke test") for
  exactly what that covered and where it hit the `auth()`/`next/headers`
  request-scope wall a live HTTP request would not have.

## Next Session Instructions

- **Exact next objective: PHASE 13 — Security + performance hardening**,
  per CLAUDE_BUILD_INSTRUCTIONS.txt §D. Phase 12 is COMPLETE — do not
  redo reviews/newsletter/support/content work; this phase is a
  dedicated audit-and-fix pass across everything Phases 1-12 already
  built, not new customer-facing features.
  1. **First, if browser automation is available in this session's
     environment, do the real end-to-end verification Phases 7-12 could
     not:** sign in as a customer in an actual rendered browser and
     click through submitting a review, subscribing to the newsletter,
     and submitting the contact form; sign in as admin/staff and click
     through approving/rejecting a review, toggling a newsletter
     subscriber, and resolving a support message — confirming each
     `useActionState`/`router.refresh()` flow actually updates the page
     from real user interaction, not just a direct function call. Fix
     anything genuinely broken before starting the hardening pass; if no
     browser automation is available, note that again and continue with
     the direct-to-domain + Server-Action-level + `curl` HTTP-level
     verification approach every phase since Phase 7 has used.
  2. Read CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 13 task list in full
     before starting — it is a checklist, not a suggestion list: audit
     every server action/route handler, input validation, authorization,
     session/cookie handling, CSRF, rate limiting for sensitive
     endpoints, security headers, CSP, upload validation, secret
     handling, dependency vulnerabilities, DB indexes/query review, N+1
     review, caching/revalidation, image/font optimization, bundle/
     client-JS review, loading/streaming review.
  3. **This is explicitly an audit-and-document phase, not just a
     fix-everything phase** — CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 13
     acceptance criteria is "document findings and fixes... no known
     critical/high-risk issue knowingly left without documentation," not
     "every finding must be fixed this session." Given the free-plan
     session-size constraint (rule "work in SMALL, COMPLETE PHASES"),
     budget time to actually audit broadly first, fix what's genuinely
     high-risk and small, and write up anything real but larger-scope
     (e.g. rate limiting, CSP) as a documented, scoped follow-up rather
     than skipping the audit to fully implement only 2-3 items.
  4. **Concrete places worth a close look, based on what Phases 1-12
     actually built** (not exhaustive — read the Phase 13 task list
     for the full scope):
     - **Rate limiting**: nothing in this codebase currently rate-limits
       anything — not `/login`, not `/register`, not
       `/forgot-password`, not `submitReviewAction`/
       `subscribeNewsletterAction`/`submitSupportMessageAction` (all
       three of which are reachable by a signed-out visitor with no
       account required). CLAUDE_BUILD_INSTRUCTIONS.txt rule A.16 says
       "do not add Redis unless the current phase has a concrete
       reason" — this may finally be that concrete reason, or an
       in-memory/DB-backed limiter may be enough at this scale; decide
       and document the reasoning either way.
     - **Security headers / CSP**: `next.config.ts` has not been
       audited for `headers()` (CSP, `X-Frame-Options`,
       `Referrer-Policy`, etc.) in any phase so far — this is genuinely
       unaudited, not just "fine."
     - **Upload validation**: no file-upload endpoint has been built in
       any phase yet (`hero_slides`/`promo_banners`/`product_images` are
       all URL/text fields, per Phase 11's own documented limitation) —
       confirm this is still true, and if so, there is nothing to audit
       here yet; don't invent an upload feature just to have something
       to harden.
     - **Session/cookie review**: NextAuth's own defaults were relied on
       since Phase 6 without a dedicated audit of cookie flags/
       `maxAge`/rotation — worth actually checking now, not assuming.
     - **DB indexes/N+1 review**: several admin list pages (`/admin/
       reviews`, `/admin/newsletter`, `/admin/support`, `/admin/
       customers`, `/admin/orders`) run a count query alongside the
       page query for pagination totals — check whether any of these
       (especially on tables without a covering index for their `WHERE`
       clause) would be a real problem at production scale, and whether
       any existing join (e.g. `listReviewsForAdmin`'s product/user
       joins) is missing an index.
     - **CSRF**: Server Actions have Next.js's built-in Origin-header
       CSRF protection; confirm nothing in this codebase bypasses it
       (e.g. a Route Handler doing a state-changing `GET`, or a
       same-origin check disabled somewhere) rather than assuming.
  5. Run `typecheck`/`lint`/`build` after any fix, same as every prior
     phase — a hardening pass that breaks the build is not a completed
     hardening pass.
  6. Update `PROGRESS.md` the same way this session did, with the full
     findings list (fixed vs. documented-as-follow-up) — this phase's
     entire deliverable is partly *this document*, not just code.
- Files/areas to inspect first: `next.config.ts` (headers/CSP — likely
  untouched since Phase 1), every `src/domains/*/actions.ts` file
  (there are now ~15 of them across all domains — this phase's job is to
  actually re-read each one with an attacker's eye, not just skim),
  `src/lib/auth/config.ts` (session/cookie configuration),
  `src/domains/reviews/actions.ts` /
  `src/domains/newsletter/actions.ts` /
  `src/domains/support/actions.ts` (Phase 12's three newest
  signed-out-reachable Server Actions — the most obvious rate-limiting
  candidates, being new and not yet battle-tested).
- Do not start Phase 14 (QA/accessibility/production readiness) before
  Phase 13's hardening pass is done, per CLAUDE_BUILD_INSTRUCTIONS.txt's
  "do not jump ahead multiple phases."

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
  `src/domains/catalog/demo-data.ts`, and (as of Phase 11) also
  wipes/re-populates `hero_slides`/`promo_banners` from the same
  fixtures. Does not touch `users`/`addresses`/`password_reset_tokens`/
  `carts`/`orders`/`coupons`/`payments`/`audit_logs`/`site_settings`/
  `reviews`/`newsletter_subscribers`/`support_messages`/etc. — the 3
  tables Phase 12 added are, like every non-catalog table before them,
  left alone by this script on purpose (it's a *catalog* seed, not a
  full-database reset).
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
used only what was already installed (same as Phases 7 and 8). No new
dependencies were added in Phase 11 either — every admin CRUD/dashboard/
audit-log feature used only what Phases 1-10 already installed. **No new
dependencies were added in Phase 12 either** — reviews/newsletter/
support/content used only what Phases 1-11 already installed.

**Note for the next session's environment setup:** this sandbox's
Postgres service has now been observed to stop silently between separate
tool calls **in more than one session** (Phase 11 saw it once; Phase 12
saw it again, this time mid-build on `/contact`'s prerender with the same
`ECONNREFUSED 127.0.0.1:5432`) — treat this as a real, recurring
characteristic of this sandbox, not a one-off. If a build or dev-server
command suddenly can't reach the database, always check
`service postgresql status` and `service postgresql start` again first
before assuming something in the code broke — this has been the actual
cause both times so far. Similarly, backgrounding `npm run start`/
`npm run dev` with a plain trailing `&` does not survive past the end of
that tool call in this sandbox — use
`setsid nohup <command> > /tmp/out.log 2>&1 < /dev/null &` (this
sandbox's `disown` is unavailable; `setsid`+`nohup` alone is sufficient)
if the next session needs a long-running server process to stay up for
`curl`-based HTTP verification across multiple tool calls. Also note:
this session created and later dropped a scratch `trends_fresh` database
for the fresh-clone migrate+seed check, and used temporary
`scripts/tmp-*.ts` verification files that were deleted before finishing
— the next session should do the same (throwaway scripts, not
committed/delivered) rather than leaving verification code in the
repository.
