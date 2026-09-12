# Trends Progress Report

## Current Status
- Overall status: Wishlist + cart (Phase 7) is implemented **and
  verified** this session — full network access was available.
  `npm install`, a fresh migration for 3 new tables (`carts`,
  `cart_items`, `wishlist_items`), `typecheck`, `lint`, `build`, a fresh
  clone migrate+seed check, and two kinds of runtime verification all
  actually ran: (1) a direct-to-domain smoke test exercising every cart/
  wishlist query function against the real seeded database — add,
  stock-capping, quantity-merge-on-duplicate-add, quantity update,
  removal, cross-cart ownership rejection, guest→user merge, idempotent
  wishlist add/remove — all passed and were cleaned up afterward; and
  (2) HTTP-level checks against a real `next build` + `next start`
  server confirming every route still renders (200s), `/account/*`
  correctly redirects to `/login` when signed out, and `/` remains `○
  (Static)`. See "Current Phase" below for what was **not** verified
  (the actual browser-driven Server Action wire calls — see the note on
  verification scope there).
- Current phase: none in progress — PHASE 7 is COMPLETE.
- Last completed phase: PHASE 7 — Wishlist + cart
- Next phase: PHASE 8 — Checkout + shipping
- Date: 2026-09-12

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
  exactly what was and wasn't covered). Do this before trusting Phase 8
  (checkout) to build on a verified-working cart.

## Next Session Instructions

- **Exact next objective: PHASE 8 — Checkout + shipping**, per
  CLAUDE_BUILD_INSTRUCTIONS.txt §D. Phase 7 is COMPLETE — do not redo
  cart/wishlist work; build checkout on top of it.
  1. **First, if browser automation is available in this session's
     environment, do the real end-to-end verification Phase 7 could not:**
     add an item to cart as a guest (via the actual UI, not curl), confirm
     the cart drawer/Header badge update, log in, confirm the guest
     cart's item appears merged into the account cart, and toggle a
     product's wishlist heart while signed in, confirming it persists
     across a page reload. Fix anything that's actually broken before
     building checkout on top of it; if no browser automation is
     available, note that in this file again and proceed carefully.
  2. Read CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 8 task list and
     TRENDS_PROJECT_CONTEXT.md §6 "Checkout"/§5 "Shipping" before writing
     code.
  3. The cart domain is ready to build on: `getCartSummary` (in
     `src/domains/cart/queries.ts`) already gives a server-authoritative,
     live-priced, availability-flagged view of the cart — checkout's
     order-total calculation should read through this same function (or
     something built directly on `cart_items`/`product_variants`), never
     from a client-submitted total.
  4. Checkout needs a real Iranian address (reuse
     `src/domains/addresses/queries.ts`, already ownership-scoped) and a
     shipping-method/fee abstraction that doesn't exist yet — per §5
     "Shipping", design this as its own small module so Phase 9's
     payment layer and Phase 10's fulfillment don't have to guess at its
     shape later.
  5. Order snapshots are a new concept this phase: unlike `cart_items`
     (which intentionally has no price snapshot, see Phase 7), `orders`/
     `order_items` **must** freeze price/discount/shipping at purchase
     time, since a cart's live-price behavior is wrong for a completed
     order whose product might change price later.
  6. Concurrency-safe inventory reservation/decrement at checkout time is
     explicitly in scope (§8 acceptance: "cannot checkout unavailable
     inventory") — this hasn't been built yet anywhere in the codebase;
     Phase 7's cart layer only *caps displayed/addable quantity* at
     stock, it does not reserve/decrement it.
  7. Payment is Phase 9 — Phase 8 only needs the *interface boundary*
     ready (per CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 8 task list), not a
     working payment provider. Do not fabricate credentials or claim a
     gateway is live (rule A.17).
  8. Run `typecheck`/`lint`/`build` and verify manually: cannot check out
     more than available stock, cannot manipulate totals from the
     browser, an order's snapshot survives a subsequent price change on
     the product.
  9. Update `PROGRESS.md` the same way this session did.
- Files/areas to inspect first: `src/domains/cart/queries.ts` (what
  checkout reads from), `src/domains/addresses/queries.ts` (address
  selection), `src/lib/db/schema/product-variants.ts` (`stock` — what
  needs concurrency-safe decrementing), `src/domains/auth/actions.ts`
  (how `getCurrentUser()`/`auth()` are already used elsewhere, for
  consistency).
- Do not start Phase 9 (promotions/payments) before Phase 8 — payment
  needs a real order to attach to.

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
  `password_reset_tokens`.

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
zod 4.6.2. No new dependencies were added in Phase 7 — cart/wishlist
used only what was already installed.
