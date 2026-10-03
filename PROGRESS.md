# Trends Progress Report

## Current Status
- Overall status: **All 15 phases complete** (unchanged from the Phase 14
  write-up below). This session was a **user-requested change, not a
  numbered phase**: the flat category list (مردان / زنان / کفش‌ها /
  اکسسوری‌ها / کلاه / عینک آفتابی) was replaced by a **three-level
  category tree** — three audiences (مردانه / زنانه / بچگانه), each with
  four groups (لباس / کفش / کیف / اکسسوری + audience), each with its own
  product types (پیراهن, تیشرت, کاپشن, پافر, ...; 176 types, 191
  categories in total). Storefront navigation (header mega-menu, mobile
  menu, footer, homepage circles, category pages, breadcrumbs), search,
  sitemap and the admin category/product screens were all updated to
  match. Migration `0009` adds a `parent_id` index and a no-self-parent
  CHECK. See "Change request — Three-level category system" under
  `## Completed`. `typecheck`/`lint`/`test` (95)/`test:integration` (41)/
  `build` all pass; also exercised over real HTTP (storefront pages,
  admin login → categories/products pages) against a real local
  PostgreSQL. Shippability is otherwise unchanged from Phase 14's
  assessment — see `docs/PRODUCTION_CHECKLIST.md`.
- **Latest change (2026-10-03, later):** add-to-cart now shows a confirmation modal (مشاهده سبد خرید / ادامه خرید) instead of the toast — `components/catalog/AddedToCartModal.tsx`, wired in `VariantSelector`. Earlier the same day: cart drawer removed; the header cart icon opens `/checkout`, now a 3-stage flow (سبد خرید → ارسال → پرداخت) with a step tracker — see "Change request — Staged checkout" under `## Completed`.
- **Earlier change (2026-09-24):** product detail page polish + Specs/Reviews tabs — see "Change request — Product detail page polish" under `## Completed`.
- **Earlier change (2026-09-19, after the category work):** header
  redesign — see "Change request — Header layout" under `## Completed`.
- Current phase: none in progress.
- Last completed phase: PHASE 14 — QA, accessibility, production
  readiness. The category-system change and the earlier admin-image-upload
  fix are documented separately under `## Completed`.
- Next phase: none — see "Next Session Instructions" for the follow-up
  backlog.
- Date: 2026-09-19

## Completed`
  for the full write-up. `typecheck`/`lint`/`test`/`test:integration`/
  `build` all pass clean; the fix was also exercised over real HTTP
  (login → upload → auth/path-traversal/spoofed-content/oversized-file
  rejection, all confirmed) against a real local PostgreSQL. The
  project's shippability status is otherwise unchanged from Phase 14's
  assessment — see `docs/PRODUCTION_CHECKLIST.md`.
- Current phase: none in progress — same as Phase 14's status; this was
  a defect fix layered on top of the completed 15-phase plan, not a new
  phase.
- Last completed phase: PHASE 14 — QA, accessibility, production
  readiness (the final phase in CLAUDE_BUILD_INSTRUCTIONS.txt's plan).
  This session's admin-image-upload fix is documented separately, below.
- Next phase: none — see "Next Session Instructions" for the prioritized
  follow-up backlog instead of a numbered phase.
- Date: 2026-09-18

## Completed

### Change request — Remove-from-cart modal (2026-10-03)
- The trash button on a stage-1 cart line no longer removes immediately; it opens `components/checkout/RemoveFromCartModal.tsx` with: «حذف کالا» (red `danger`), «انصراف» (outline, initial focus), «افزودن به علاقه‌مندی‌ها» (purple `brand`).
- «افزودن به علاقه‌مندی‌ها» = **move to wishlist** (assumption): `toggleWishlistAction(productId, true)` first, then remove the cart line; if the wishlist write fails the item stays in the cart. Success toast «کالا به علاقه‌مندی‌ها منتقل شد».
- Guests have no persisted wishlist, so the button shows a sign-in notice and leaves the cart unchanged.
- State lives in `CheckoutView` (`pendingRemove`, `isRemoving`, errors). Checks: typecheck, lint, 102 unit tests pass; not verified in a browser.

### Change request — Add-to-cart modal (2026-10-03)
- Replaces the success toast in `VariantSelector` (its only add-to-cart caller). New `AddedToCartModal`: check badge, "محصول به سبد خرید اضافه شد", size/color/quantity line, purple "مشاهده سبد خرید" (link to `/checkout`) and outline "ادامه خرید" (closes). Backdrop click, close button and Escape also close; focus trap/restore via `useDialogA11y`, initial focus on "ادامه خرید". Enter animations in `globals.css` respect reduced motion.
- `ToastProvider` is untouched and still available. Checks: typecheck, eslint (catalog), 102 unit tests pass. Not verified in a browser.

### Change request — Staged checkout (2026-10-03)
User-requested change, not a numbered phase.
- **Removed** `components/overlays/CartDrawer.tsx` and its mount in `app/layout.tsx`; removed `isCartOpen/openCart/closeCart` from `UIOverlayProvider`.
- **Add to cart** (`VariantSelector`) now only shows the success toast; it no longer opens anything.
- **Header cart icon** is now a `<Link href="/checkout">` (badge unchanged).
- **`/checkout`** (`app/checkout/page.tsx`) no longer redirects guests to `/login` or empty carts to `/`. Stage 1 works for guests and shows an empty state for an empty cart.
- **`CheckoutView`** rewritten as three client-side stages (state, not routes):
  1. سبد خرید — line items (image, title→product link, size, color swatch, unit price, quantity ±, line total, remove), coupon field, summary with total.
  2. ارسال — address cards + add-address form, shipping method, order note. Guests see a login/register gate (cart merges on login).
  3. پرداخت — review (address/method/items with edit links), payment method card, "ثبت سفارش و پرداخت" → existing `placeOrderAction`.
- **`CheckoutStepper.tsx`** (new): ordered list, `aria-current="step"`, finished steps are buttons. Icons: `CartIcon` (header cart icon), `ShippingIcon` and `PaymentIcon` (the ones used in the homepage benefits strip).
- `ShippingIcon`/`PaymentIcon` in `ui/icons.tsx` now spread `props` (default stroke unchanged, so the benefits strip is identical). Added `TrashIcon`, `ArrowLeftIcon`, `ArrowRightIcon`, `TagIcon`, `BagIcon`.
- After any cart mutation the page calls `router.refresh()` (shipping methods depend on the subtotal for free-shipping) and re-previews an applied coupon.
- Server authority unchanged: `placeOrderAction` still receives only addressId, shipping code, note, coupon code.
- No DB/schema changes. Checks run: `typecheck` OK, `lint` OK, `test` 102 passed. **Not run:** `next build`, integration tests (no PostgreSQL in the session) and any in-browser check (no browser tooling). Verify visually (RTL, mobile) before shipping.
- Known follow-ups: no `callbackUrl` after login (login still lands on `/account`; user clicks the cart icon again); stage is component state, so browser Back leaves checkout rather than going to the previous stage.

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


### Phase 13 — Security + performance hardening (COMPLETE)

**Goal:** a dedicated audit-and-fix pass across everything Phases 1-12
built, per CLAUDE_BUILD_INSTRUCTIONS.txt §D's Phase 13 task list — no
new customer-facing features, no schema changes.

**Real findings, fixed this session (not just theoretical hardening):**

1. **Error-message leakage in `addToCartAction`**
   (`src/domains/cart/actions.ts`) — it caught *any* `Error` thrown by
   `addItemToCart` and returned `error.message` to the client verbatim.
   Every other domain's `actions.ts` (`orders`, `promotions`) only
   surfaces `.message` for a specific, known custom error class and
   rethrows anything else — safe, because Next.js turns an uncaught
   Server Action error into a generic digest-only message on the
   client rather than leaking it. `cart/actions.ts` was the one
   outlier. Fixed by introducing `ProductUnavailableError` (a new
   exported class in `cart/queries.ts`) for the two known "product
   unavailable/out of stock" conditions, and narrowing the catch in
   `addToCartAction` to `instanceof ProductUnavailableError` only,
   matching the rest of the codebase's established pattern. A genuine
   unexpected DB failure now rethrows and shows the client a generic
   message instead of a raw driver/SQL string.
2. **No rate limiting anywhere** — confirmed via grep (no
   `middleware.ts`, no rate-limit calls in any action file) that this
   was genuinely unaudited, not just "fine." Added
   `src/lib/security/rate-limit.ts`: a small in-memory, fixed-window,
   IP-keyed limiter (`checkRateLimit`/`getClientIp`/`checkIpRateLimit`).
   **Deliberately not Redis** — this app is a single Node.js process
   (`next start`), not a documented multi-instance/serverless
   deployment (see the file's header comment for the exact reasoning
   and the specific scaling point that *would* justify Redis later).
   Wired into every previously-unprotected, signed-out-reachable
   mutation: `registerAction` (5/hour/IP), `loginAction`
   (10/5min/IP — generous, so a mistyped password never locks anyone
   out), `requestPasswordResetAction` (5/hour/IP),
   `resetPasswordAction` (10/hour/IP), `subscribeNewsletterAction`
   (10/hour/IP), `submitSupportMessageAction` (5/hour/IP), and — as
   defense-in-depth on top of its existing structural controls
   (must be signed in, must have purchased, one review per product) —
   `submitReviewAction` (20/hour/IP).
3. **JSON-LD injection hardening** — the one `dangerouslySetInnerHTML`
   site in the codebase (`/product/[slug]`'s `Product` structured data)
   used plain `JSON.stringify()`, which doesn't escape `<`, so a
   literal `</script>` inside a serialized string would prematurely
   close the script tag. The only fields serialized are admin/staff-
   authored catalog fields (not raw customer input), so the practical
   risk was low, but the fix costs nothing: added
   `src/lib/utils/safe-json-ld.ts`'s `safeJsonLd()` (escapes `<` to
   `\u003c`) and switched the one call site to it.
4. **No security headers/CSP at all** — `next.config.ts` had never
   been audited for this (confirmed, not assumed). Added a `headers()`
   block: `Content-Security-Policy`, `X-Frame-Options: DENY`,
   `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`,
   `Permissions-Policy` (denies camera/microphone/geolocation/payment/
   usb — this store uses none of them), and
   `Strict-Transport-Security`. **The CSP's `script-src`/`style-src`
   include `'unsafe-inline'` rather than the stricter nonce-based
   `'nonce-...' 'strict-dynamic'` form Next.js supports via
   middleware** — see `next.config.ts`'s header comment for the full
   reasoning: implementing that correctly needs a new `middleware.ts`
   plus verification that every one of Next's own injected hydration/
   RSC-payload scripts actually receives the nonce, and this sandbox
   has no browser-automation tool (a documented limitation since
   Phase 7) to click through the app afterward and confirm hydration/
   interactivity wasn't broken — a misconfigured strict CSP fails
   *closed* (blank, non-interactive page), which is worse for a
   customer-facing storefront than today's absence of a header.
   **Flagged as this phase's one explicit, larger-scope follow-up** —
   see "Next Session Instructions."

   **Post-delivery correction (same day):** the first delivered version
   sent this CSP unconditionally, including under `next dev` — but
   development-mode React/Turbopack genuinely needs `eval()` (component
   stack reconstruction, HMR), which `'unsafe-eval'` was never granted
   in `script-src`, so `next dev` threw "eval() is not supported in
   this environment" in the browser console (production React never
   calls `eval()`, so this never affected `next build`/`next start`).
   Rather than weakening the policy everywhere with `'unsafe-eval'`,
   `next.config.ts`'s `headers()` now only attaches
   `Content-Security-Policy` when `process.env.NODE_ENV ===
   "production"` — the other five headers (`X-Frame-Options` etc.) are
   harmless in dev and stay unconditional. Verified both ways this
   session: `next dev` no longer sends a `Content-Security-Policy`
   header at all (confirmed via `curl -I`) and the homepage loads with
   no console error; `next build && next start` still sends the exact
   same CSP as before (confirmed via `curl -I` again, byte-for-byte
   identical header value).
5. **A real, systemic query-performance bug: pagination "total" counts
   fetched every matching row just to take `.length`, instead of a SQL
   `COUNT(*)`.** Found by grepping for the pattern across every admin
   list/count query and confirming each site individually. Fixed (using
   drizzle-orm's `count()` helper, already used elsewhere in this
   codebase) in: `listRootCategoryCount` (`categories/queries.ts`),
   `countStaffAndAdminUsers` + `listCustomersForAdmin`
   (`customers/queries.ts`), `listOrdersForAdmin` (`orders/queries.ts`),
   `listProductsForAdmin` (`catalog/admin-queries.ts`),
   `listReviewsForAdmin` + `countPendingReviews`
   (`reviews/admin-queries.ts`), `listSubscribersForAdmin`
   (`newsletter/queries.ts`), `listSupportMessagesForAdmin` +
   `countUnresolvedSupportMessages` (`support/queries.ts`),
   `listAuditLogs` (`analytics/audit.ts`), and all three counts inside
   `getAdminDashboardSummary` (`admin/dashboard.ts` — the
   highest-traffic site, read on every `/admin` visit). At this
   catalog's current scale the old pattern was harmless, but it would
   degrade linearly with table growth for no reason; the fix is
   behavior-identical and was verified to return the exact same numbers
   as the old pattern against the real seeded database (see
   "Tests/checks").
6. **A real caching-correctness bug: `/shipping-policy` and `/contact`
   silently go stale after an admin changes `site_settings`.** Both
   pages read `getSiteSettings()` (shipping fees/threshold, support
   email/phone) via a plain Drizzle query in a Server Component with no
   `dynamic`/`revalidate` export. Because Next.js's static-vs-dynamic
   detection only recognizes its own patched `fetch()` (not a raw
   Postgres driver call), both pages are statically prerendered at
   build time — confirmed by actually re-running `next build` with
   Postgres stopped: it failed trying to prerender `/contact` with an
   `ECONNREFUSED` from exactly that query, proving it runs at build
   time, not per-request. `updateSiteSettingsAction`
   (`admin/settings-actions.ts`) already called `revalidatePath` for
   `/admin/settings` and `/checkout`, but never for these two public
   pages — meaning a shipping-fee change from the admin UI would never
   actually reach a real visitor's browser until the next full
   rebuild, defeating the entire point of reading the values "live."
   Fixed by adding `revalidatePath("/shipping-policy")` and
   `revalidatePath("/contact")` to the same action.

**Audited and confirmed fine, no code change needed:**

- **Session/cookie configuration** (`src/lib/auth/config.ts` +
  NextAuth/Auth.js defaults, read directly from
  `node_modules/@auth/core`): `HttpOnly: true`, `SameSite: "lax"`,
  `Secure` auto-enabled over HTTPS, 30-day idle JWT session — all sound
  defaults for a customer storefront; not weakened or overridden
  anywhere in this codebase.
- **Reauthentication/step-up checks for high-risk account changes** —
  there is currently no self-service password-change or email/mobile-
  change feature at all (only the separate forgot-password → token →
  reset-password flow, and a read-only `/account` profile page), so
  there is no such surface to harden yet. Noted for whenever that
  feature is built.
- **CSRF** — only two Route Handlers exist
  (`/api/auth/[...nextauth]`, `/api/payments/callback/mock`); neither
  performs a state change based on an unauthenticated same-origin
  assumption in a way CSRF protection would meaningfully add to (the
  mock payment callback's `GET`-based state change is inherent to how
  every real redirect-based Iranian/international gateway callback
  works, and is already protected by a high-entropy, unguessable
  `providerRef`/authority plus `finalizePaymentVerification`'s existing
  idempotency — not a CSRF gap). Every Server Action gets Next.js's
  built-in Origin-header CSRF protection automatically; nothing in this
  codebase disables or bypasses it.
- **Upload validation** — confirmed via grep (no `type="file"`, no
  `multipart`, no `File`-typed `FormData` reads anywhere) that no
  upload feature exists in this codebase at all yet
  (`hero_slides`/`promo_banners`/`product_images` remain URL/text
  fields, per Phase 11's own documented limitation). Nothing to audit;
  not invented just to have something to harden.
- **Dependency vulnerabilities** (`npm audit`): 4 moderate findings,
  all the same root cause — `drizzle-kit`'s bundled dev-server tooling
  depends on a vulnerable `esbuild` range (`esbuild <=0.24.2`,
  GHSA-67mh-4wv8-2f99, "enables any website to send requests to the
  dev server and read the response"). This only affects
  `drizzle-kit`'s own local dev server (used for
  e.g. `drizzle-kit studio`), which is never run in production and is
  not bundled into the deployed app — `drizzle-kit` is a `devDependency`
  used at migration-generation time only. `npm audit fix --force` would
  downgrade `drizzle-kit` to `0.18.1`, a breaking change with no
  concrete production benefit; left as-is and documented rather than
  forcing a risky downgrade for a dev-only, non-shipped issue.
- **DB indexes / N+1 review** beyond the count-query fix above: audited
  every `for (const ... of ...)` loop across `src/domains` — all of
  them build in-memory lookup maps from a single already-batched query
  result (the same documented pattern `orders/queries.ts` and
  `cart/queries.ts` already comment as intentional), none issue a
  per-iteration database call. No genuine N+1 read pattern found.
  Schema indexes on the columns actually filtered/joined on
  (`users.mobile` unique, `orders.userId`, `orders.orderNumber` unique,
  `reviews` product/status/user+product composite, etc.) were already
  in place from earlier phases.
- **Image/font optimization**: no external image or font hosts are
  referenced anywhere (`next.config.ts`'s `images.remotePatterns`
  remains empty, confirmed no `fonts.googleapis.com`/CDN references via
  grep) — the font strategy is still the documented Phase 1 fallback
  (system font stack; no Vazirmatn `.woff2` files were ever supplied),
  unchanged and not a new Phase 13 concern. Nothing to add to
  `img-src`/`font-src` beyond `'self' data:`.
- **Bundle/client-JS review**: no `next/script` usage anywhere in the
  codebase (confirmed via grep) — nothing to nonce or defer. No new
  client-heavy dependencies were introduced this phase.

**New files this phase:** `src/lib/security/rate-limit.ts`,
`src/lib/utils/safe-json-ld.ts`.

**Files changed this phase:** `next.config.ts` (headers/CSP),
`src/domains/cart/queries.ts` + `actions.ts` (`ProductUnavailableError`),
`src/domains/auth/actions.ts` (rate limiting on 4 actions),
`src/domains/newsletter/actions.ts`, `src/domains/support/actions.ts`,
`src/domains/reviews/actions.ts` (rate limiting), `src/domains/admin/settings-actions.ts`
(the two missing `revalidatePath` calls), `src/domains/categories/queries.ts`,
`src/domains/customers/queries.ts`, `src/domains/orders/queries.ts`,
`src/domains/catalog/admin-queries.ts`, `src/domains/reviews/admin-queries.ts`,
`src/domains/newsletter/queries.ts`, `src/domains/support/queries.ts`,
`src/domains/analytics/audit.ts`, `src/domains/admin/dashboard.ts` (all
the `count()` fixes), `src/app/product/[slug]/page.tsx` (`safeJsonLd`).

**Database changes:** none — application-code-only phase, as expected.

**Tests/checks — all run against a real local PostgreSQL 16 instance and
a real `next build` + `next start` production server:**

- `npm run typecheck` — clean, re-run after every batch of edits.
- `npm run lint` — clean, re-run after every batch of edits.
- `npm run build` — clean. Route table confirmed unchanged from Phase
  12 (`/`, `/about`, `/contact`, `/faq`, `/forgot-password`,
  `/privacy-policy`, `/returns-policy`, `/shipping-policy`, `/terms`,
  `/robots.txt`, `/sitemap.xml` remain `○ (Static)`; everything
  auth/session/cart/order/admin-related remains `ƒ (Dynamic)`) — this
  phase did not accidentally change any page's rendering mode (the
  `/contact`/`/shipping-policy` fix is a revalidation-on-write fix, not
  a rendering-mode change).
- **Real bug caught by re-running the build with Postgres stopped**
  (see finding #6 above): confirmed `/contact` and `/shipping-policy`
  are genuinely statically prerendered by observing the exact
  `ECONNREFUSED` prerender failure, not by assumption.
- Fresh-ish migration check: re-ran `npm run db:migrate` against the
  already-migrated local database — all 8 existing migrations
  (`0000`-`0007`) re-apply as a clean no-op (Postgres `NOTICE`s only,
  no errors), confirming migrations remain idempotent. No new
  migrations were generated this phase (no schema changes).
  `npm run db:seed` re-ran cleanly afterward.
- Direct-to-domain smoke test (scratch `tsx` script, deleted after):
  unit-tested `checkRateLimit`'s fixed-window logic in isolation (allow
  up to the limit, reject the next request, correct positive
  `retryAfterSeconds`, a new window after expiry allows requests again,
  distinct keys never share a bucket) — all passed.
- Direct-to-domain smoke test #2 (scratch `tsx` script, deleted after):
  called every fixed count function
  (`listCustomersForAdmin`/`countStaffAndAdminUsers`/
  `listOrdersForAdmin`/`listProductsForAdmin`/`listRootCategoryCount`/
  `getAdminDashboardSummary`) against the real seeded database and
  compared each result to an independent raw `SELECT COUNT(*)` query —
  every fixed function's `total` matched the raw count exactly
  (11 products, 6 root categories, 0 orders/customers in the seeded-
  only database, staff/admin count 0).
- HTTP-level checks against `npm run start`: confirmed the new security
  headers (`Content-Security-Policy`, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security`) are present via `curl -I` on both a
  static page (`/`) and a redirect response (`/checkout` → `/login`,
  307) — confirming `headers()` in `next.config.ts` applies globally,
  not just to page routes. Re-ran the same representative page set
  Phase 7-12 have used (`/login`, `/register`, `/forgot-password`,
  `/category/[slug]`, `/search?q=...`, `/about`, `/faq`, `/terms`,
  `/privacy-policy`, `/returns-policy`, `/shipping-policy`, `/contact`,
  `/product/[slug]`) after the CSP/headers change — all still return
  200 with expected content, confirming the new CSP doesn't visibly
  break server-rendered HTML output (see "What was not verified" below
  for the real limit of this check).
- **What was *not* verified this session, and why:** as with every
  phase since Phase 7, there is no browser-automation tool available in
  this sandbox, so (a) the rate limiter's *wiring into* each Server
  Action was verified by code review + the limiter's own logic tests
  above, not by driving an actual rendered login/register/contact form
  past its limit through a real browser; and (b) the new CSP was only
  confirmed not to break server-rendered HTML output and page response
  codes — it was **not** confirmed to leave client-side interactivity
  (hydration, `useActionState` form submissions, cart/wishlist context
  providers, carousel/drawer JS) fully working, since that requires
  actually executing the page's JavaScript in a browser. This is the
  specific, concrete reason `'unsafe-inline'` was kept instead of
  switching to nonce-based strict CSP this session (see finding #4) —
  flip that CSP behavior and it becomes untestable in this sandbox in a
  way that could break the site with no way to catch it before
  delivery.

**Known limitations / follow-ups (not blocking, documented rather than
silently ignored):**
- **Nonce-based strict CSP (`script-src 'nonce-...' 'strict-dynamic'`)
  is the one explicitly deferred larger-scope item from this phase** —
  see finding #4 above and `next.config.ts`'s header comment. Implement
  via a new `middleware.ts` generating a per-request nonce, verify
  Next.js's own injected scripts pick it up correctly, and — critically —
  actually click through the app in a real browser afterward (login,
  register, add-to-cart, checkout, admin CRUD forms, the mock payment
  simulator) before shipping it, since a broken CSP fails closed.
- The in-memory rate limiter resets on every server restart/deploy and
  does not share state across multiple Node processes/containers — fine
  for this app's current single-process deployment shape (see
  `rate-limit.ts`'s header comment for the exact reasoning), but would
  need a shared store (Redis, or a `sql` table with a cheap TTL sweep)
  the moment the app runs behind more than one Node process.
- `drizzle-kit`'s dev-only `esbuild` dependency vulnerability
  (GHSA-67mh-4wv8-2f99) remains — not fixable without a breaking
  `drizzle-kit` downgrade, and not exploitable in production (dev-server-
  only, not bundled). Revisit whenever `drizzle-kit` ships a version
  with the dependency resolved naturally.
- Carried over, still outstanding from prior phases (unchanged by this
  session, since this phase's scope was hardening, not new features):
  no guest checkout, no `callbackUrl` round-trip through `/login`, no
  self-service newsletter unsubscribe link, no customer-facing "my
  reviews"/"my support messages" history views, policy-page copy not
  legally reviewed, and every phase-since-7's "real browser/Server-
  Action-wire-protocol verification has not been done" limitation
  (still true for this phase's own rate-limited actions too — see
  "What was not verified" above).



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

### Phase 14 — QA, accessibility, production readiness (COMPLETE WITH FOLLOW-UP)
Goal: turn the application into a shippable product per
CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 14 task list — the final phase in
the 15-phase plan.

**No test runner existed anywhere in this repo before this phase**
(`tests/unit`, `tests/integration`, `tests/e2e` were empty placeholder
directories, and `package.json` had no `test` script) — choosing and
wiring one up was explicitly this phase's own job per the prior session's
handoff note, not a prerequisite someone else needed to finish first.

**Test infrastructure implemented:**
- Installed Vitest (`vitest`, plus `vite-tsconfig-paths` during setup,
  later removed once `resolve.tsconfigPaths: true` in `vitest.config.ts`
  turned out to cover the same need without the extra dependency — rule
  F.6). `vitest.config.ts` splits unit vs. integration by directory
  (`tests/unit/**`, `tests/integration/**`) rather than by tag, and sets
  `fileParallelism: false` so integration test *files* never race each
  other's fixtures against the one shared database (individual `it()`s
  within a single race-condition test still run genuinely concurrently
  via `Promise.allSettled` — that's the actual thing being tested).
- `package.json` scripts: `test` (unit only, no DB — safe as a CI/
  pre-commit default), `test:watch`, `test:integration` (real Postgres,
  loads `.env.local` via Node's native `--env-file` flag rather than
  adding a `dotenv-cli` dependency), `test:all` (both).
- **66 unit tests**, 5 files, all pure functions with zero I/O:
  `tests/unit/money.test.ts` (Toman formatting, discount-percent edge
  cases — negative/zero/equal compare-at prices, rounding), `phone.test.ts`
  (every accepted Iranian mobile input shape, Persian/Arabic-Indic digit
  conversion, and explicitly the exact cross-format dedup scenario Phase
  6's bug was about), `order-lifecycle.test.ts` (the full
  `orders/lifecycle.ts` transition table — every (from, to) status pair,
  not just the happy path; confirms `paid` is unreachable as an
  admin-transition target from *any* status), `roles.test.ts`
  (`isStaffOrAdmin`/`isAdmin`, including fail-closed behavior on
  tampered/malformed role strings), `validation.test.ts` (the Zod schemas
  in `lib/validation/storefront.ts` and `lib/validation/auth.ts` —
  reviews, newsletter, contact, mobile normalization-via-preprocess,
  password length bounds including bcrypt's 72-char effective limit,
  address/postal-code normalization, register password-confirmation
  mismatch).
- **25 integration tests**, 4 files, against a real local PostgreSQL
  (migrated + seeded, same database the app itself uses), each with a
  `tests/integration/helpers.ts` fixture layer (`trends-test-`-prefixed
  slugs/codes so fixtures are unambiguous in a shared dev database) and
  an `afterAll` that deletes every row it created, in FK-safe order,
  verified by direct `psql` row-count checks before/after full suite runs
  (some bugs in the test files' own cleanup ordering were caught and
  fixed this way during development — see "What was verified" below):
  - `inventory-race.test.ts` — critical flow #7 ("insufficient stock":
    empty cart, zero/depleted stock, a variant deactivated after being
    added to cart) and the concurrency guarantee `createOrderFromCart`'s
    own header comment claims: two simultaneous checkouts for 1 unit of
    stock (`Promise.allSettled` — exactly one succeeds, the other gets a
    real `InsufficientStockError`, final stock is 0, not negative), and a
    harder 5-attempts-for-3-units version (exactly 3 succeed, exactly 2
    rejected, stock ends at exactly 0).
  - `coupon-validation.test.ts` — critical flow #8 ("invalid coupon"):
    unknown code, inactive, not-yet-started, expired, below minimum
    basket, case-insensitive code matching, discount capped at subtotal
    (never negative order total), percentage discount flooring, per-
    customer redemption limit, and *total* usage limit (rejects a
    *different* customer once the limit is spent). Plus a real
    concurrency test: two simultaneous checkouts racing for a coupon with
    `usageLimit: 1` — exactly one order gets the discount, exactly one
    `couponRedemptions` row exists afterward (the `FOR UPDATE` lock
    documented in `promotions/queries.ts`'s header comment, now verified
    under an actual race rather than just read as a comment).
  - `payment-idempotency.test.ts` — critical flow #6 ("duplicate payment
    callback"): first callback marks the order `paid`; a second identical
    callback returns `already_processed` and changes nothing (order
    status, payment status, and the `payment_events` audit trail all
    stay exactly as they were — asserted with exact event-type counts,
    not just "no error"); a third callback that flips `success: false`
    after the payment already succeeded is *also* ignored (can't
    downgrade a settled payment); a failed-then-retried-success sequence
    correctly stays failed (no late flip to paid); an unknown reference
    returns `not_found`; and two *genuinely concurrent* callbacks for the
    same reference (real `Promise.allSettled`, not sequential awaits)
    resolve to exactly one `succeeded` + one `already_processed`, with
    the order ending up `paid` either way.
  - `ownership.test.ts` — re-verifies the "account ownership checks
    exist" claim made in every phase since Phase 6/7, this time end to
    end against real rows for a real second user, not just by code
    review: a second user cannot read/update/delete a first user's
    address (all three return null/false, not an error — matching each
    function's documented "ownership mismatch is structurally
    unrepresentable as success" contract); setting a new default address
    unsets the old default *for that user only* (a second user's default
    is untouched); wishlist add is idempotent and strictly per-user
    (double-add doesn't duplicate, another user's wishlist is unaffected,
    removing a product you never wishlisted is a safe no-op); a cart item
    can't be updated/removed via a different cart's id (both return
    `false`, the real item's quantity is untouched).

**Accessibility pass and focus-trap fix (`CLAUDE_BUILD_INSTRUCTIONS.txt`'s
  "keyboard navigation of dialogs/drawers"):** code review of
  `src/components/overlays/CartDrawer.tsx` and `SearchOverlay.tsx` found
  a real, previously-undetected gap dating back to Phase 2: `CartDrawer`
  had a backdrop and an Escape-key handler but **no `role="dialog"`/
  `aria-modal`, no initial focus movement, and — critically — no focus
  trap**, meaning a keyboard user tabbing after opening the cart drawer
  could tab straight through it into storefront links behind the
  backdrop. `SearchOverlay` had correct dialog semantics and focused its
  input on open, but likewise had no Tab trap and never returned focus to
  the search-trigger button on close. Fixed by extracting a shared
  `src/lib/hooks/useDialogA11y.ts` hook (remembers the previously-focused
  element on open, moves focus into the dialog, traps Tab/Shift+Tab
  within the dialog's focusable elements while open, closes on Escape,
  restores focus to the trigger on close/unmount) and wiring it into both
  components; `CartDrawer`'s `<aside>` also gained `role="dialog"`/
  `aria-modal={isCartOpen}`, which it was missing entirely before. The
  header's mobile-nav toggle (`Header.tsx`) was reviewed and intentionally
  left as-is — it's a disclosure/dropdown pattern (`aria-expanded` on the
  trigger, no backdrop, doesn't cover other page content), which doesn't
  need focus-trap treatment under the same WAI-ARIA reasoning that gives
  modal dialogs one.

**Error-boundary pass:** `src/app/error.tsx` (root — inside `RootLayout`,
  so Header/Footer/overlays still render around it; a "تلاش مجدد" retry
  button plus a link home; shows `error.digest` for support correlation,
  never `error.message`/stack), `src/app/global-error.tsx` (fires only if
  `RootLayout` itself throws; Next.js requires it to render its own
  `<html>`/`<body>` with zero dependency on Tailwind/providers/anything
  that might itself be what's broken — plain inline styles only), and
  `src/app/admin/error.tsx` (denser/utilitarian tone matching the rest of
  `/admin`, a "بازگشت به داشبورد" link instead of home). `not-found.tsx`
  already existed (Phase 2) and was left unchanged.

**Production documentation (`docs/`):** `DEPLOYMENT.md` (the single-
  process deployment constraint — this app's rate limiter is an in-memory
  `Map`, not Redis, so more than one Node process behind a load balancer
  silently weakens it; every required env var and what actually reads it,
  confirmed by grepping `process.env.*` rather than assumed; the
  build-time database dependency, reproduced live this session — see
  "What was verified" below), `PRODUCTION_CHECKLIST.md` (itemized
  DONE / BLOCKING / PRE-LAUNCH — explicitly not a wall of unchecked boxes
  pretending everything is equally unfinished; cross-references the exact
  file/test that verifies each DONE item), `BACKUP_AND_MIGRATIONS.md`
  (Drizzle Kit migration workflow/discipline, `pg_dump`/`pg_restore`
  commands, a restore-drill recommendation using `test:integration`
  itself as the "did the restore actually work" check), `OBSERVABILITY.md`
  (what already exists — `audit_logs`/`order_status_history`/
  `payment_events` as the real durable business-event record, the three
  new error boundaries' `console.error` calls, Next.js's own automatic
  server-side error logging — versus what a future phase should add:
  external error tracking, a `/api/health` endpoint, alerting, structured
  request-correlated logging). `README.md` was fully rewritten — the
  previous version was still describing Phase 1's status.

**What was verified this session** (full network access was available):
- `npm run typecheck` — clean, before and after every change.
- `npm run lint` — clean, before and after every change.
- `npm test` — 66/66 unit tests pass.
- `npm run test:integration` — 25/25 integration tests pass against a
  freshly migrated+seeded local PostgreSQL 16, run multiple times during
  development to catch and fix real bugs in the test fixtures' own
  cleanup ordering (products must be deleted before their category due to
  the FK; an early version of `inventory-race.test.ts` also had a
  scenario that was wrong on its own terms — `addItemToCart` already
  refuses to add a variant with 0 stock, so "stock is 0 at checkout" had
  to be reached by depleting stock *after* the item was already in the
  cart, not by creating the fixture with 0 stock outright — fixed by
  reducing stock via a direct `db.update` after `addItemToCart`
  succeeds, matching how this can actually happen in production: another
  checkout or an admin action depleting stock between add-to-cart and
  this checkout attempt). Verified via direct `psql` row counts that the
  database returns to exactly its seeded state (6 categories, 11
  products, 0 users/orders/coupons) after a full suite run — no test
  pollution left behind.
- `npm run build` — clean, 37 routes (18 static, 19 dynamic), confirmed
  the exact same `/contact`-prerender-needs-a-reachable-database failure
  mode `DEPLOYMENT.md` now documents (this sandbox's Postgres stopped
  between tool calls mid-session — the same recurring sandbox behavior
  every phase since Phase 11 has noted; see "Commands" below — and the
  build failed with an unambiguous `ECONNREFUSED` at the exact
  query/file/line, not a silent partial build); rebuilt clean once
  Postgres was restarted.
- `npm audit`: 4 moderate-severity advisories, unchanged from Phase 13's
  finding (all `drizzle-kit`'s dev-only `esbuild` dependency — see that
  phase's write-up). Re-checked, not re-litigated.
- Removed `@vitejs/plugin-react` after confirming it was never actually
  needed (installed speculatively while setting up Vitest, superseded by
  `resolve.tsconfigPaths: true`) — re-ran `npm test` after removing it to
  confirm nothing depended on it.

**Known limitations, stated plainly (per CLAUDE_BUILD_INSTRUCTIONS.txt §C
  "if the project is not yet runnable, document exactly why" — this
  project *is* runnable/buildable/testable, but is not yet ready to take
  real customer payments):**
- **Real-browser/`Next-Action`-wire-protocol verification was still not
  available this session** — same sandbox limitation every phase since
  Phase 7 has hit; no browser automation tool exists in this environment.
  The accessibility fix above was implemented and reasoned through
  carefully (the focus-trap hook's logic is straightforward and the
  before/after gap was real and specifically identified by reading the
  actual component code, not guessed at), but was **not** clicked through
  in a real browser with a screen reader or keyboard-only navigation to
  confirm it behaves as intended in practice. This is the single most
  important follow-up for whoever next has browser automation available.
- **No E2E test suite** (`tests/e2e/` is still an empty placeholder) —
  Playwright/Cypress was deliberately not installed given the same "no
  browser automation available to verify it actually drives a real
  browser correctly" reasoning; installing a framework that can't be
  exercised in this sandbox would add dependency weight without adding
  verified coverage. A future session with browser automation should
  install Playwright and implement the 12 critical flows as real E2E
  tests, building on the fixture/cleanup patterns already established in
  `tests/integration/helpers.ts`.
- **A real Iranian payment gateway, a real SMS/OTP provider, and object
  storage/CDN for product media are still not configured** — unchanged
  from every prior phase (rule A.17); see
  `docs/PRODUCTION_CHECKLIST.md`'s BLOCKING items.
- **The nonce-based strict CSP Phase 13 deferred is still deferred** —
  same reasoning (needs `middleware.ts` plus real-browser hydration
  verification, still unavailable here).
- Every other carried-over item from Phases 6-13 (no guest checkout, no
  `callbackUrl` round-trip through `/login`, placeholder shipping fees,
  un-reviewed policy copy, manual-only refunds, and more) is unchanged —
  see "Known Issues / Technical Debt" below for the complete cumulative
  list, none of it silently dropped.

**Is the project genuinely shippable, per CLAUDE_BUILD_INSTRUCTIONS.txt
  §I's quality bar?** Structurally and technically, yes — every phase in
  the 15-phase plan is now complete, the full stack builds/tests/lints
  clean, and the business-critical concurrency/idempotency/ownership
  guarantees this store depends on (never oversell, never double-apply a
  coupon or a payment, never let one customer touch another's data) now
  have real automated tests proving them under real concurrent load, not
  just code comments asserting them. **It is not yet shippable to accept
  real customer payments**, for reasons that are entirely business/
  operational, not code-quality: no real payment gateway, no real
  shipping rates, no legal review of policy pages. `docs/
  PRODUCTION_CHECKLIST.md` is the authoritative, itemized answer to
  "what specifically remains" — read it before making a launch decision,
  rather than this paragraph's summary.


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

### Phase 13 additions
- The rate limiter is a plain in-process `Map`, not Redis — a deliberate
  reading of rule A.16 ("don't add Redis unless the current phase has a
  concrete reason") together with F.1/F.6 (simplest solution, fewer
  dependencies): this app's only documented deployment shape is a single
  Node.js process, for which an in-process limiter is correct and
  sufficient. The exact condition that would change this call (running
  behind more than one Node process/container) is documented in the
  file itself, not left implicit.
- Rate limits key on client IP, not on the submitted mobile
  number/email — keying on the *attacker-controlled* input would let an
  attacker sidestep their own limit by rotating the value, or exhaust a
  *victim's* limit by repeatedly submitting the victim's real mobile
  number from a script.
- The CSP ships with `'unsafe-inline'` for `script-src`/`style-src`
  rather than a nonce-based strict policy — a deliberate, documented
  trade-off given this sandbox's total absence of browser-automation
  tooling to verify a stricter policy doesn't silently break hydration.
  See finding #4 in this phase's write-up and `next.config.ts`'s header
  comment for the full reasoning, and "Known limitations" for the
  specific follow-up.
- The pagination "total count" fix uses drizzle-orm's built-in `count()`
  helper (already used once in `categories/queries.ts` before this
  phase) rather than a hand-written `sql\`count(*)\`` template at every
  call site — consistent with an existing in-codebase convention rather
  than introducing a second way to write the same query.

### Phase 14 additions
- Test-file layout splits by directory (`tests/unit/**` vs.
  `tests/integration/**`), not by filename suffix/tag — simplest way for
  `vitest.config.ts` to point two different npm scripts at two disjoint
  globs, and it makes "does this test need a database" visually obvious
  from its path alone.
- Integration-test fixtures are real inserted/deleted rows against the
  actual schema (`tests/integration/helpers.ts`), not mocks/stubs of the
  database layer — the entire point of this suite is proving the
  concurrency guarantees (`FOR UPDATE` locks, conditional `UPDATE ...
  WHERE stock >= quantity`) hold under real PostgreSQL transaction
  semantics; a mocked db layer cannot demonstrate a real race condition
  resolving correctly.
- `useDialogA11y` (`src/lib/hooks/useDialogA11y.ts`) is one shared hook
  used by both `CartDrawer` and `SearchOverlay`, not two separate
  implementations — the focus-trap/Escape/focus-restore behavior is
  identical dialog semantics regardless of which panel it's protecting,
  and a bug fix or refinement to the trap logic should only need to
  happen in one place.
- Chose Vitest over Jest for the test runner — no existing Jest
  configuration/convention anywhere in this codebase to be consistent
  with, native ESM/TypeScript support without a separate `ts-jest`
  transform step, and it already shares the same underlying transform
  pipeline (esbuild, via Vite) that `tsx` (already a dependency, used for
  `db:seed`) also uses — one less distinct toolchain in the project.

### Change request — Editable product specifications table (2026-09-25)

**Requested:** admins can edit the «مشخصات محصول» table in the product admin
panel and add custom rows.

**Implemented:**
- New table `product_specifications` (migration `0011_product_specifications`):
  `product_id` FK (cascade), `label`, `value`, `display_order`; DB-enforced
  `UNIQUE (product_id, label)`, label 1–80 / value 1–500 char CHECKs, index on
  `(product_id, display_order)`.
- Model: the automatic rows (brand, category, material, sizes, colors, tags)
  stay derived from product/variant data. Admin rows are **custom** rows
  appended after them; a custom row whose label matches an automatic row
  (normalized: whitespace, Arabic/Persian ی/ک, case) **replaces that row's
  value in place** — this is how automatic rows are overridden.
- `src/domains/catalog/specifications.ts` (`listProductSpecifications`,
  `replaceProductSpecifications` — delete+insert in one transaction).
- `saveProductSpecificationsAction` (admin-actions.ts): staff/admin check,
  product existence check, `productSpecificationsSchema` (trims, drops fully
  blank rows, rejects half-filled rows / duplicate labels / >30 rows), audit
  log `product.specifications.update`, revalidates storefront + admin pages.
- Admin UI: `ProductSpecificationsEditor` section on
  `/admin/products/[id]` — add/remove/reorder rows, label suggestions for the
  automatic labels.
- Storefront: `CatalogProductDetail.specifications`; `ProductSpecs` merges them.
- Helpers: `lib/utils/spec-label.ts`, `lib/validation/spec-limits.ts`.

**Tests/checks:** `typecheck` pass; `test` 102/102 (new
`tests/unit/product-specifications.test.ts`); `test:integration` 46/46 (new
`tests/integration/product-specifications.test.ts`: save/replace/order,
transactional rollback, DB length + unique constraints, cascade, storefront
read); `build` pass; SSR of `/product/classic-shirt` verified with an override
row and an appended row. `eslint` clean on touched folders.
**Not verified:** the admin editor UI and the Server Action itself were not
exercised in a browser / over the real wire protocol (no browser here) — the
schema, domain function and storefront output were tested directly.
**Migration to run:** `npm run db:migrate`.

### Change request — Product detail page polish + Specifications/Reviews tabs (2026-09-24)

**Requested:** polish `/product/[slug]` to match the site's design language;
replace the old description block with a two-tab section — مشخصات محصول and
دیدگاه‌ها.

**Implemented:**
- New `ProductTabs` (client; only owns which tab is visible; both panels are
  server-rendered and passed in, inactive one stays in the DOM `hidden`).
  WAI-ARIA tabs, roving tabindex, Arrow/Home/End (arrow direction follows
  computed `direction`, so RTL is correct), `#reviews`/`#specs` hash selects
  a tab. Pill-style tab bar (`bg-header-bg` track, `bg-ink` active).
- New `ProductSpecs` (server): rows derived from existing data — brand,
  category (linked), material, sizes (sold-out sizes struck through), colors
  with swatches, tags; rows are omitted when data is missing. The product's
  `longDescription` now renders above the table (under «توضیحات») so admin
  text isn't lost; remove that block in `ProductSpecs.tsx` if it should go.
- `ReviewsSection` redesigned: summary card (average, stars, count,
  per-star distribution computed from the already-fetched approved list),
  review cards with pastel initial avatars, verified-purchase chip, dates in
  Asia/Tehran. Fixes a latent bug: the notice boxes used `bg-header`, which
  is not a defined token (real one is `bg-header-bg`), so they had no
  background.
- `VariantSelector`: larger touch targets (44px), size/color fieldsets with
  the selected value in the legend, round swatch buttons for colors that
  have a hex, pill quantity stepper, low-stock line shows the real count,
  new `secondaryAction` slot. `WishlistToggleButton` is now a round icon
  button beside the add-to-cart CTA (accessible name + `aria-pressed`).
- Page: brand/title/rating link (jumps to reviews tab), short description,
  variants block, links to `/shipping-policy` and `/returns-policy`; tabs
  below the fold, related products after them. Gallery radius/thumbnails
  aligned with cards; `loading.tsx` skeleton matches the new layout.

**Files:** `src/app/product/[slug]/{page,loading}.tsx`,
`src/components/catalog/{ProductTabs,ProductSpecs,ReviewsSection,VariantSelector,ProductGallery}.tsx`,
`src/components/ui/WishlistButton.tsx`, `src/domains/catalog/queries.ts`
(`CatalogProductVariant` gains read-only `material`).
**Database changes:** none. **Cart/price/stock logic:** unchanged (server
still re-reads variant price/stock on add-to-cart).

**Checks:** `typecheck` pass; `test` 95/95 pass; `build` pass (against local
PostgreSQL + seed); SSR HTML of `/product/classic-shirt` verified over HTTP
(tabs, both panels, reviews, rating link, JSON-LD). `lint` reports 3
pre-existing errors in `AuthSessionProvider.tsx` and `HeaderSearch.tsx`
(react-hooks rules) — none in files touched here.
**Not verified:** no browser was available, so visual layout and tab
interaction/keyboard behavior were not exercised in a real browser —
please eyeball desktop/tablet/mobile.

### Change request — Header layout (three columns)

**Requested:** bigger header, three columns — left: brand logo only
(bigger); right: profile + cart buttons with bigger icons; centre: two
rows — a wide search box (replacing the search button), then only
«مردانه»، «زنانه»، «بچگانه» with their hover menus. The other nav links
(صفحه اصلی / فروشگاه / درباره ما) are removed.

**Implemented (`src/components/layout/Header.tsx`, rewritten):**
- **lg and up:** 3-column grid `1fr | 2.4fr | 1fr` (equal side tracks so
  the centre is truly centred). Placement is by *physical* side as
  requested: logo on the **left**, cart+account on the **right**. The page
  is RTL (grid column 1 = right), so actions are `lg:col-start-1`, centre
  `lg:col-start-2`, logo `lg:col-start-3`; swap 1 and 3 to flip. Logo
  44px→84px tall; icon buttons 46→56px with 36px icons; header ≈115px
  tall (was 68px).
- **Search box:** `next/form` GET to `/search?q=…` (`role="search"`,
  visible-to-AT `<label>`, `type="search"`, `required`, `maxLength=100`,
  submit button inside the field). Works without JS. The old
  `SearchOverlay` is unchanged and still opens from the search icon below lg.
- **Category row:** the existing `CategoryMegaMenu`, now in the centre
  column's second row (row runs to the header's bottom edge so the menu
  panel has no hover dead-zone); trigger text slightly larger
  (`nav-styles.ts`); panel `max-h` adjusted for the taller header.
- **Below lg:** compact single bar as before (logo, search icon, cart,
  account, hamburger → category accordion); the home/shop/about links were
  removed from the accordion too. The logo is the home link.
- **Bug fixed on the way:** `CartIcon`/`AccountIcon`/`SearchIcon` in
  `components/ui/icons.tsx` ignored `className`/props (never spread), so
  the header's `h-[30px] w-[30px]` had *never applied* — the icons were
  always 24px. They now spread props and use `currentColor` (so `text-ink`
  takes effect: #182630 instead of pure black).
- **Logo image:** added `sizes` so Next serves a small generated variant
  instead of the 1536px source (277KB webp).
- Removed dead code: the scroll-spy `IntersectionObserver` and the
  plain-link render helpers.

**Checks:** `typecheck`, `lint` (0 warnings), `build` clean; served HTML
verified (search form → `/search`, exactly three category links in the
nav, old links gone, logo srcset uses small widths, `/search?q=…` 200).
**Not verified:** how it actually *looks* and behaves in a browser (no
browser in the sandbox) — spacing, the mega-menu panel's alignment under
the taller header, the logo at 84px, and tablet widths near 1024px should
be eyeballed. The sticky header is now ~115px of the viewport on desktop;
if that feels heavy, use `relative` instead of `sticky top-0` in `Header.tsx` (do NOT just delete `sticky`: the
menu panel needs the header to be positioned — `relative` or `sticky` — or it stops appearing). The header is now `relative z-40` (not sticky).

### Change request — Three-level category system (مردانه / زنانه / بچگانه)

**Requested:** replace the whole category system with three main
categories (مردانه، زنانه، بچگانه); each has four sub-categories (لباس،
کفش، کیف، اکسسوری + audience); each of those has its own list of product
types (e.g. men's clothing: shirt, t-shirt, jacket, pants, hoodie, puffer,
...).

**Model.** Same `categories` table (self-referencing `parent_id`), now
used as a fixed-depth tree: audience (1) > group (2) > type (3). The
canonical tree is **`src/domains/categories/taxonomy.ts`** (pure data, no
imports): 3 audiences, 12 groups, 176 types = 191 categories. Adding a type
= one `[key, label]` line there + `npm run db:sync-categories`.
- Slugs stay single, globally unique URL segments so `/category/[slug]`
  and the unique index are unchanged: `men`, `men-clothing`,
  `men-clothing-shirts`. (`men`/`women` keep their old slugs; `kids` is new.)
- Type names carry the audience word (`پیراهن مردانه`) because they are
  shown out of context (page titles, search, admin picker, product
  breadcrumbs). A few (`لباس نوزاد`, `کفش نوزاد`, `اکسسوری نوزاد`) skip it.
- **Products attach to type (leaf) categories only** — enforced
  server-side in `createProductAction`/`updateProductAction`
  (`getProductCategoryError`). Audience/group pages list everything
  beneath them (`inArray(products.categoryId, subtreeIds)`).
- An inactive category hides its **whole branch** in the storefront
  (`buildCategoryTree(..., { activeOnly: true })`).

**New files:** `src/domains/categories/{taxonomy,tree,sync}.ts`,
`src/lib/db/sync-categories.ts`, `src/components/layout/{CategoryMegaMenu,
MobileCategoryMenu,nav-styles}`, `src/components/catalog/SubcategoryNav.tsx`,
`tests/unit/{category-taxonomy,category-tree}.test.ts`,
`tests/integration/category-tree.test.ts`,
`drizzle/migrations/0009_talented_agent_zero.sql`.
- `tree.ts` — pure helpers (build/flatten tree, trail, subtree ids,
  `validateCategoryParent`, `toNavTree`), cycle-safe.
- `sync.ts` — `syncCategoryTaxonomy` (idempotent upsert by slug, one
  transaction; sets name/parent/order/description, **never touches
  `isActive`/`imageUrl`**, never deletes), `auditCategoryAssignments`,
  `deactivateCategoriesOutsideTaxonomy` (opt-in).

**Changed:** `src/domains/catalog/queries.ts` (`getCategoryTree`,
`getRootCategories` replaces `getActiveCategories`, `getCategoryBySlug`
now returns depth/trail/children/siblings, category listing aggregates the
subtree, product detail returns `categoryTrail`, related products top up
from the parent group, search also matches category names, sitemap only
lists reachable categories), `src/app/layout.tsx` (now `async`; reads the
tree for header+footer), `Header.tsx` (desktop mega-menu + mobile nested
`<details>` menu; hardcoded /category/men|women|accessories links removed),
`Footer.tsx` (audience > group links), `CategoryNav.tsx` (3 homepage
circles), category page (full breadcrumb + `SubcategoryNav`: group tiles on
an audience page, type pills on a group page, sibling pills on a type page),
product page breadcrumb, `presentation.ts` (swatches men/women/kids),
`seed.ts` (uses the taxonomy; the 11 demo products are spread over all
three audiences), `demo-data.ts` (`demoCategories` removed), admin
category actions/queries/form/row/page (tree-ordered table with indent and
subtree product counts; parent picker excludes self/descendants/level-3;
server-side `validateCategoryParent`: no cycles, max 3 levels), admin
product form (leaf-only picker grouped in `<optgroup>`s), admin product
list (category filter includes descendants), `package.json`
(`db:sync-categories`).

**Database:** migration `0009` — `categories_parent_id_idx` +
`categories_no_self_parent_check` CHECK. Data is *not* changed by the
migration; use `db:seed` (dev, wipes catalog) or `db:sync-categories`
(existing DB, non-destructive).

**Migrating an existing database:** `npm run db:migrate` then
`npm run db:sync-categories`. It prints (a) old categories outside the new
taxonomy (`shoes`, `hats`, ... — left alone unless
`-- --deactivate-outside` is passed, which only sets `isActive=false`) and
(b) products still filed on a category that now has children (e.g. on the
old `men`). Re-filing those products (which gender for an old «کفش‌ها»
product?) is a merchandising decision — done in `/admin/products`. Verified
against a simulated legacy database (6 old categories + 2 products):
189 created / 2 updated, second run 0/0/191 unchanged, report and
deactivate flag behaved as described.

**Tests/checks (real local PostgreSQL 16, `next build` + `next start`):**
- `npm run typecheck` clean; `npm run lint` 0 errors (the one pre-existing
  `<img>` warning in `Footer.tsx` was fixed afterwards by switching the
  social icons to `next/image` — lint is now fully clean); `npm test` 95 pass (+29 new);
  `npm run test:integration` 41 pass (new file covers sync idempotency and
  isActive/imageUrl preservation, drift repair, root/group/type listings,
  inactive-branch hiding, search by category name, related-products
  top-up, leaf rule, self-parent CHECK, assignment audit);
  `npm run build` clean, `/` still `○ (Static)`.
- HTTP: `/`, `/category/{men,men-clothing,men-clothing-shirts,kids,...}`
  200 with correct breadcrumbs/tiles/pills and aggregated products
  (men = 7 demo products, kids = 1); old `/category/shoes` → 404 +
  noindex; `/product/classic-shirt` breadcrumb مردانه › لباس مردانه ›
  پیراهن مردانه; sitemap lists 191 category URLs; search "کفش" finds the
  sneaker via its category; as a real admin session: `/admin/categories`
  renders 191 rows in tree order with depth indentation and subtree
  counts, `/admin/products/new` shows 176 leaf options in 12 optgroups,
  `/admin/products?category=<audience id>` filters the subtree (a
  garbage id returns an empty list, not an error).
- **Not verified (same standing gap as every phase — no browser
  automation in the sandbox):** the mega-menu's hover/focus/Escape
  behaviour, the mobile `<details>` menu, and the category/product
  **Server Actions** (create/update category, create/update product) over
  the real Next-Action wire protocol. Their validation logic is covered by
  unit/integration tests (`validateCategoryParent`,
  `getProductCategoryError`), the wiring is thin.

### Defect fix — Admin image upload (browse-and-upload for hero/categories/banners/products)

**Reported problem:** in the admin panel, there was no way to browse for
and choose an image file for hero slides, categories, or promo banners
on the homepage; products could only have an image set by pasting a URL.

**Root cause, confirmed by reading the actual code (not assumed):**
`hero_slides`/`categories`/`promo_banners` had no image column at all —
Phase 11's own PROGRESS.md write-up documented this explicitly ("no
image-upload/URL column yet — there is still no object-storage/CDN
pipeline"), and the homepage rendered all three through the `AssetSlot`
placeholder component instead. `product_images.url` already existed as
a real column, but the admin form for it (`ProductVariantsAndImages.tsx`)
only exposed a plain "paste a URL" text field. `ProductCard.tsx` even had
a comment saying the `next/image` rendering path was "wired up and ready
for when Phase 11's admin media upload lands" — i.e. this was a known,
previously-documented gap, not a new bug.

**Fix — new admin media upload endpoint + reusable picker component:**
- `src/app/api/admin/media/route.ts` (new) — a `POST` Route Handler,
  gated by the same `isStaffOrAdmin` check every other admin mutation
  uses (re-checked here directly, never trusting that `/admin`'s layout
  gate was the only thing standing between a request and this endpoint).
  Accepts a `multipart/form-data` body (`file` + `folder`), validates:
  - `folder` against a fixed allow-list (`products`/`hero`/`categories`/
    `banners`) — never a caller-supplied path segment, which forecloses
    path traversal regardless of what a client sends (verified — see
    "Tests/checks").
  - File content by **magic-byte sniffing** (JPEG/PNG/WebP/GIF
    signatures), never trusting the browser-supplied `File.type` or
    filename extension (verified with a spoofed-content-type text file
    renamed `.jpg` — correctly rejected).
  - Size, capped at 5 MB.
  Then writes the file to `public/assets/<folder>/` under a fresh
  `randomUUID()` filename (the original filename, and any
  attacker-controlled characters in it, never reaches the filesystem)
  and returns `{ url: "/assets/<folder>/<uuid>.<ext>" }`.
  Also rate-limited (`checkRateLimit`, keyed by user id + IP,
  30/minute) as defense-in-depth alongside the auth check.
  **Local disk storage, not real object storage/CDN** — documented at
  length in the route's own header comment: TRENDS_PROJECT_CONTEXT.md
  §3 calls for object storage + a CDN, but no provider/credentials are
  configured anywhere in this project (`.env.example`'s
  `STORAGE_BUCKET_URL` etc. are still blank). Per rule F.1 ("prefer the
  simplest production-safe solution") this stores uploads under
  `public/assets/<folder>/`, served by Next.js exactly like the
  prototype's original static assets already are — a real, working fix
  for the reported problem on the current single-process deployment
  topology. It stops being sufficient the moment the app runs behind
  multiple stateless instances with no shared filesystem; swapping the
  route's `writeFile` call for a real object-storage adapter is then a
  contained, single-file change, since every caller only ever sees
  `{ url }` come back from `POST /api/admin/media`, never a filesystem
  path. Flagged here and in `.env.example`'s updated comment, not
  silently left implicit (rule A.18).
- `src/components/admin/ImagePicker.tsx` (new) — a `"use client"`
  browse-and-upload component: a visible "انتخاب تصویر" button opens the
  OS file picker, the chosen file uploads immediately to
  `POST /api/admin/media`, and the returned URL is written into a hidden
  `<input type="hidden" name={name}>` so the surrounding form's existing
  Server Action needs **no changes** — it still just reads a URL string
  from `FormData`, exactly as before. Shows a live thumbnail preview,
  an upload-in-progress state, and a collapsed "یا آدرس تصویر را وارد
  کنید" fallback (an operator can still paste/reuse an existing URL
  without re-uploading it) — browse is the primary path, not the only
  path.

**Schema/migration** (`drizzle/migrations/0008_married_speedball.sql`,
generated via `drizzle-kit generate` and applied/verified against a real
local Postgres): added a nullable `image_url` text column to
`categories`, `hero_slides`, and `promo_banners`. Nullable (not
`NOT NULL`) specifically so existing rows created before this migration
don't break — they simply keep rendering through `AssetSlot` until an
operator adds an image. `product_images` needed no schema change (its
`url` column already existed); only its admin form's input type changed.

**Validation** (`src/lib/validation/admin.ts`): added `imageUrl` to
`categorySchema` (optional — a category can exist without a picture),
and made it a **required** field on `heroSlideSchema`/`promoBannerSchema`
(a hero slide or promo banner with no image doesn't make sense on this
homepage design) — this only affects *creating or editing* a slide/
banner going forward; existing null-image rows are untouched until
someone edits them.

**Wired into all four admin forms** (each swapped its URL text field, or
added a new field where none existed, for `<ImagePicker>`, and each
admin list view gained a small thumbnail):
- `src/components/admin/ProductVariantsAndImages.tsx` — replaced the
  "آدرس تصویر (URL)" text field with `<ImagePicker name="url"
  folder="products">`; the existing image list now shows a real
  thumbnail per row.
- `src/components/admin/HeroSlideManager.tsx` — added
  `<ImagePicker name="imageUrl" folder="hero" required>`; the slide list
  now shows a thumbnail (or a "بدون تصویر" placeholder for pre-migration
  rows) instead of text only.
- `src/components/admin/PromoBannerManager.tsx` — same pattern,
  `folder="banners"`.
- `src/components/admin/CategoryForm.tsx` / `CategoryRow.tsx` — added
  `<ImagePicker name="imageUrl" folder="categories">` (optional) to the
  form and a small circular thumbnail to the admin category table.

**Storefront rendering updated to use the real image when present,
falling back to `AssetSlot` otherwise** (no behavior change for rows
that still have no image):
- `src/domains/catalog/queries.ts` — `CatalogCategory`/
  `CatalogCategoryDetail` gained `imageUrl`; `getActiveCategories`/
  `getCategoryBySlug` select it.
- `src/domains/categories/queries.ts` — `AdminCategoryRow`/
  `listCategoriesForAdmin` gained `imageUrl`.
- `src/components/home/CategoryNav.tsx` — renders a real circular
  `next/image` when `category.imageUrl` is set, else the existing
  `AssetSlot`.
- `src/components/home/HeroCarousel.tsx` — `HeroSlideLike` gained
  `imageUrl`; renders a real `fill`-positioned `next/image`
  (`priority` on the first slide only) when set, else `AssetSlot`.
  Added `relative` to the slide container (required for `fill` to
  position correctly) — the only non-additive class change this fix
  made to an existing element.
- `src/components/home/PromoBanners.tsx` — `PromoBannerLike` gained
  `imageUrl`; same real-image-else-`AssetSlot` pattern.
- `src/components/catalog/ProductCard.tsx` — **unchanged**; it already
  had the real `next/image` path ready (per its own Phase-11-era
  comment), it simply had nothing to render before because
  `product_images` rows could only be created via a pasted URL. No code
  change was needed here — only the admin form that populates the data
  it reads.

**Files changed/added this session:**
```
src/lib/db/schema/categories.ts                  (edited — imageUrl column)
src/lib/db/schema/hero-slides.ts                 (edited — imageUrl column)
src/lib/db/schema/promo-banners.ts               (edited — imageUrl column)
drizzle/migrations/0008_married_speedball.sql    (new, generated)
drizzle/migrations/meta/*                        (new, generated)
src/lib/validation/admin.ts                      (edited — imageUrl on 3 schemas)
src/app/api/admin/media/route.ts                 (new)
src/components/admin/ImagePicker.tsx             (new)
src/components/admin/ProductVariantsAndImages.tsx (edited)
src/components/admin/HeroSlideManager.tsx        (edited)
src/components/admin/PromoBannerManager.tsx      (edited)
src/components/admin/CategoryForm.tsx            (edited)
src/components/admin/CategoryRow.tsx             (edited)
src/domains/categories/queries.ts                (edited — imageUrl in AdminCategoryRow)
src/domains/catalog/queries.ts                   (edited — imageUrl in CatalogCategory(Detail))
src/components/home/CategoryNav.tsx              (edited)
src/components/home/HeroCarousel.tsx             (edited)
src/components/home/PromoBanners.tsx             (edited)
.env.example                                     (edited — STORAGE_BUCKET_URL comment updated)
public/assets/banners/.gitkeep                   (new — banners had no asset folder before)
```

**Database changes:** 1 new migration (`0008_married_speedball.sql`) —
3 `ALTER TABLE ... ADD COLUMN image_url text` statements (all nullable,
no data migration needed, no existing rows affected).

**Environment/config changes:** none required to use this fix (no new
env vars). `.env.example`'s `STORAGE_BUCKET_URL` comment block was
updated to note that uploads currently land on local disk via the new
route, and to point at it for whoever wires in real object storage
later.

**Tests/checks — all run this session against a real local PostgreSQL 16
instance (freshly installed in this sandbox) and a real `next build` +
`next start` production server, exactly per this project's established
verification discipline:**
- `npx tsc --noEmit` — clean (one real type error caught and fixed along
  the way: `getCategoryBySlug`'s inline select was missing the new
  `imageUrl` field, which the shared `CatalogCategory` type now
  requires — fixed by adding it to that query's column list).
- `npx eslint src --max-warnings=0` — clean.
- `npm run db:generate` — generated the migration above from the schema
  changes; inspected the output SQL before applying it (3 plain
  `ADD COLUMN`, nothing unexpected).
- `npm run db:migrate` — applied cleanly (all 9 migrations, `0000`
  through this session's new `0008`) against a freshly installed local
  Postgres 16.
- `npm run db:seed` — succeeded (6 categories, 11 products, 2 hero
  slides, 2 promo banners) — confirms the new nullable columns don't
  break the existing seed script.
- `npm run build` — clean; route table unchanged except the new
  `ƒ /api/admin/media` entry.
- `npm test` — 66/66 unit tests pass (unaffected by this change).
- `npm run test:integration` — 25/25 integration tests pass against the
  real database (unaffected by this change).
- **Real HTTP end-to-end verification against `npm run start`** (not
  just direct-to-domain — this is a Route Handler, not a Server Action,
  so it's directly `curl`-able without the `Next-Action` wire-protocol
  limitation every phase since Phase 7 has documented for Server
  Actions):
  - Inserted a real `admin`-role test user directly into `users`
    (bcrypt-hashed password via the project's own `bcryptjs`
    dependency), logged in via `/api/auth/csrf` →
    `/api/auth/callback/credentials` (the same real-cookie pattern
    every prior phase's HTTP checks use), confirmed `/api/auth/session`
    returns the correct `role: "admin"`.
  - `GET /admin/content` with the session cookie → `200` (confirms the
    admin layout's role gate still passes for this account).
  - `POST /api/admin/media` with a real signature-valid JPEG,
    `folder=categories`, and the session cookie → `201`, returned
    `{"url":"/assets/categories/<uuid>.jpg"}`; confirmed via `ls` that
    the file genuinely landed on disk at that exact path.
  - `POST /api/admin/media` **with no session cookie** → `403`,
    `{"error":"شما اجازه دسترسی به این بخش را ندارید"}` — unauthenticated
    upload correctly rejected.
  - `POST /api/admin/media` with `folder=../../etc` (path-traversal
    attempt) → `400`, `{"error":"مقصد فایل نامعتبر است"}` — rejected by
    the fixed allow-list before ever touching the filesystem.
  - `POST /api/admin/media` with a plain text file renamed `.jpg` and
    `Content-Type: image/jpeg` (spoofed extension + spoofed MIME type)
    → `400`, `{"error":"قالب فایل پشتیبانی نمی‌شود...`} — rejected by
    the magic-byte signature check, confirming it does not trust either
    the filename or the declared content type.
  - `POST /api/admin/media` with a >5 MB file (valid JPEG magic bytes,
    padded past the size cap) → `400`,
    `{"error":"حجم فایل نباید بیش از ۵ مگابایت باشد"}`.
  - Test upload artifact and test admin user removed afterward (the
    uploaded test file deleted from `public/assets/categories/`; the
    test user was only ever in this sandbox's ephemeral local Postgres,
    not part of the delivered database state).
- **What was *not* verified this session, and why:** the four admin
  forms' `<ImagePicker>` integration was **not** clicked through in a
  real rendered browser (select a file via the OS picker, watch the
  preview appear, submit the surrounding form) — same sandbox
  limitation every phase since Phase 7 has documented (no browser
  automation tool available here). What *was* verified instead: the
  upload endpoint itself works correctly end-to-end over real HTTP
  (above, including all four rejection paths), the resulting URL shape
  (`/assets/<folder>/<uuid>.<ext>`) is exactly what each form's hidden
  input expects, `npm run build`/`typecheck`/`lint` confirm the
  component compiles and type-checks correctly against each of the four
  forms it's used in, and the seed/migration/query-layer changes were
  verified against a real database. A session with browser automation
  available should click through all four "browse → preview → save"
  flows once, and should also fold this into the same accumulated
  browser-verification backlog Phase 14's "Next Session Instructions"
  already documents.

**Known limitations / follow-ups (not blocking, documented rather than
silently ignored):**
- **Uploaded images are not resized/optimized/re-encoded on upload** —
  a 5 MB source photo is stored and served as-is (through `next/image`,
  which does optimize *serving*, but the original file on disk is still
  whatever size was uploaded). Acceptable at this store's current scale;
  revisit with a real image-processing step (e.g. `sharp`) if upload
  sizes or storage become a real concern.
- **No admin UI to delete/replace an orphaned uploaded file** — removing
  an image from a slide/banner/category/product (via "حذف تصویر" or
  picking a different one) leaves the old file sitting in
  `public/assets/<folder>/`; nothing currently garbage-collects
  unreferenced uploads. Not a correctness or security issue (unreferenced
  files are inert), but a real disk-usage cleanup task for later if
  upload volume grows.
- **Local disk storage does not survive a redeploy on most hosting
  platforms** (e.g. anything with an ephemeral filesystem) and does not
  work at all behind more than one stateless server instance with no
  shared volume — see the route's own header comment and
  `.env.example`'s updated note. This is the same category of
  "documented, deliberate, not-yet-built infrastructure" item
  TRENDS_PROJECT_CONTEXT.md §3 already lists (object storage + CDN);
  this fix makes the *feature* work correctly today without pretending
  the long-term infrastructure gap doesn't exist.
- Real-browser click-through of the four admin forms' file-picker UI is
  still outstanding — see "What was not verified" above; folded into the
  existing browser-automation backlog (see "Next Session Instructions").

## Auth UI polish (out-of-phase UI-only task)
- Scope: login, register, forgot-password, reset-password pages. No schema/migration changes, no auth logic changes.
- New: `components/auth/AuthShell.tsx` (two-panel card + `AuthAlert`), `PasswordField.tsx` (show/hide), `NewPasswordFields.tsx` (advisory strength meter + live match; server rules unchanged, min 8), `useFocusOnError.ts` (focus first invalid field/alert).
- `FormField` gained optional props only (hint, labelAction, endAdornment, dir, inputMode, autoFocus, inputProps); other callers unaffected.
- `ActionResult` gained optional `values` (mobile/name/email echoed on failure so React 19 form reset does not wipe input; passwords never echoed). Used by login/register.
- Forms use `noValidate` so Persian server messages show instead of native browser tooltips.
- Checks: `tsc --noEmit` pass, `eslint src` pass, Next compile pass. `npm run build` and visual/browser check NOT run (no PostgreSQL in sandbox; build needs DATABASE_URL). Verify visually on RTL mobile + desktop.

## Toast messages (out-of-phase UI-only task)
- `components/feedback/ToastProvider.tsx` (`useToast().showToast(msg)`), mounted in `app/layout.tsx` around UIOverlayProvider. Bottom-center ink pill, 3s total (250ms in/out), aria-live polite, reduced-motion respected (keyframes in globals.css).
- Fired from `VariantSelector` (add to cart success) and `WishlistButton` (add only; signed-in users after the server save succeeds, guests on local toggle). Not shown on removal or failure.
- Checks: tsc + eslint pass; not verified in a browser (no PostgreSQL in sandbox).

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

### Phase 13 addition
- The specific rate-limit numbers chosen (e.g. 10 login attempts per 5
  minutes per IP, 5 registrations per hour per IP) are reasonable
  judgment calls, not values specified anywhere in
  TRENDS_PROJECT_CONTEXT.md/CLAUDE_BUILD_INSTRUCTIONS.txt — chosen to
  meaningfully slow down automated abuse while being generous enough
  that no realistic legitimate customer hits them by mistake. Revisit
  if real production traffic patterns suggest otherwise.

### Phase 14 addition
- No E2E framework (Playwright/Cypress) was installed, on the assumption
  that a dependency that can't be exercised in this sandbox (no browser
  automation available) shouldn't be added speculatively — rule F.6
  ("prefer fewer dependencies") read together with "don't block waiting
  for non-critical clarification" cuts the other way here: better to
  document the gap precisely (see "Known Issues" below and this phase's
  own write-up) than to add an unusable, unverified framework.
- Treated "production readiness" and "ready to accept real payments" as
  two different bars, and scoped this phase's checklist accordingly —
  CLAUDE_BUILD_INSTRUCTIONS.txt's Phase 14 acceptance criteria ("fresh
  setup is documented," "production build succeeds," "critical tests
  pass," "no known blocking issue," "progress report says exactly what
  remains") are about the codebase's technical readiness, not a business
  decision about whether real Iranian payment/SMS credentials have been
  procured. `docs/PRODUCTION_CHECKLIST.md` keeps these visually separate
  (DONE/PRE-LAUNCH vs. BLOCKING) rather than implying the whole project
  is equally unfinished.

### Admin image upload defect fix addition
- Chose **local disk storage** (`public/assets/<folder>/`) over blocking
  the fix on real object storage/CDN being configured — no provider or
  credentials exist anywhere in this project yet (§3), and the reported
  problem ("can't browse and choose an image") is solvable correctly at
  today's single-process deployment scale without them. Documented at
  length in `src/app/api/admin/media/route.ts`'s header comment as the
  specific point (multiple stateless instances, no shared filesystem)
  at which this choice needs to change, and what the contained fix looks
  like when it does (swap one `writeFile` call for a real adapter, since
  every caller only ever sees the returned `{ url }`).
- Made `imageUrl` **required** on `heroSlideSchema`/`promoBannerSchema`
  but left it **optional** on `categorySchema` — a business judgment
  call (rule A.18), not something either source document specifies: a
  hero slide or promotional banner is a purely visual homepage element
  with no other content, so one with no image doesn't make sense once an
  operator is actively creating/editing it; a category can reasonably
  exist (and already did, extensively, before this fix) without a
  picture. Existing rows created before this migration keep `imageUrl:
  null` regardless — the required validation only applies going forward,
  to a create/edit action's own submission.

### Category-system change addition

- The taxonomy contents (which types exist for each audience/group, the
  Persian labels, e.g. `لباس نماز و چادر` under women's clothing, kids'
  `لباس نوزاد`) are my proposal, not a supplied list — edit
  `taxonomy.ts` freely and re-run `db:sync-categories`. Types are
  audience-specific (women's has manteau/tunic/skirt/dress types, men's
  has suit/tie types, ...), not a mechanical copy.
- Kids is one audience (no separate boys/girls level), per the request.
- Products may only be filed on leaf categories; a legacy product on a
  non-leaf category keeps working but must be re-filed to be edited in
  the admin form.
- Max depth is 3; the admin refuses deeper nesting and cycles.
- Empty categories are shown in menus (the store is expected to fill the
  tree; hiding empty ones would make the structure invisible right now).

## Known Issues / Technical Debt

**Category-system change (this session):**
- **No redirects for retired category URLs.** `/category/shoes`,
  `/category/accessories`, `/category/hats`, `/category/sunglasses` now
  404 (on a fresh seed they no longer exist). Any hero slide / promo banner
  `ctaHref` or external link pointing at them must be updated
  (`/admin/content`); `/category/men` and `/category/women` still exist
  and now show the whole audience. Add 301s if old URLs were public.
- **Header/footer now read the DB in the root layout.** Every statically
  prerendered page bakes in the menu at build time (needs a reachable DB
  at build, as the homepage already did). Admin category edits call
  `revalidatePath("/", "layout")`, but `db:seed` / `db:sync-categories`
  run outside Next, so an already-built production site must be
  restarted/redeployed to show a re-synced tree.
- **Empty categories appear in menus.** Only 11 demo products exist
  across 191 categories. A "hide categories with no products" option
  (or product counts in the menu) is the obvious next refinement once
  real stock is loaded.
- **Products in an inactive category stay visible** in search and on
  their product page (pre-existing behaviour — category visibility never
  gated products); only category listings/menus/sitemap honour it. The
  product breadcrumb may therefore link to a category page that 404s.
- Admin `/admin/categories` is one 191-row indented table (no search /
  collapse); there is no bulk "move products from category A to B" tool
  (relevant when migrating a legacy catalog — see the sync report).
- Header mega-menu and mobile `<details>` menu are unverified in a real
  browser (no automation available); WCAG 1.4.13 behaviours (hover,
  focus, Escape, click-to-close) are implemented but untested. The panel
  is only rendered while open, so the full tree is in the RSC props of
  every page (~200 short strings) but not in the initial HTML.
- Category URLs are flat slugs (`/category/men-clothing-shirts`), not
  nested paths. Fine for SEO and simple; switching to nested URLs would
  mean a catch-all route and per-parent slug uniqueness.

**Earlier:**

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

Phase 13 adds:

- **CSP ships with `'unsafe-inline'`, not nonce-based strict CSP** — see
  this phase's write-up finding #4 and "Known limitations" for the full
  reasoning and the exact follow-up (implement via `middleware.ts`, then
  verify in a real browser before shipping).
- **The in-memory rate limiter is single-process only** — resets on
  restart, doesn't share state across multiple Node processes. Fine for
  this app's current deployment shape; would need a shared store the
  moment that changes (see `rate-limit.ts`'s header comment).
- **`drizzle-kit`'s dev-only `esbuild` dependency has an unfixed moderate
  advisory** (GHSA-67mh-4wv8-2f99) — not exploitable in production
  (dev-server tooling only, not bundled), not fixable without a breaking
  `drizzle-kit` downgrade with no concrete benefit. Revisit when
  `drizzle-kit` resolves it upstream.
- **Real browser/`Next-Action`-wire-protocol verification of this
  phase's own rate-limited actions has not been done** — same sandbox
  limitation as every phase since Phase 7; the rate limiter's core logic
  was verified in isolation and each action's wiring was verified by
  code review (see this phase's "Tests/checks").
- Carried over, still outstanding: no guest checkout, no `callbackUrl`
  round-trip through `/login`, no self-service newsletter unsubscribe
  link, no customer-facing "my reviews"/"my support messages" history
  views, policy-page copy not legally reviewed, and every phase-since-7's
  browser-verification limitation for every action built before this one.

Phase 14 adds:

- **Real-browser/keyboard verification of the new `useDialogA11y` focus
  trap has not been done** — same sandbox limitation as every phase since
  Phase 7. The logic was implemented carefully and reasoned through (see
  Phase 14's write-up), but "the focus trap correctly cycles Tab through
  real rendered DOM in a real browser" has not been clicked through with
  a keyboard, only reviewed as code. **This is now the single highest-
  value thing for a future session with browser automation to verify
  first**, given it's a genuine, previously-undetected accessibility gap
  this phase found and fixed.
- **No E2E test suite exists** (`tests/e2e/` is still an empty
  placeholder) — see "Important Assumptions" → Phase 14 addition for why
  it wasn't started this phase.
- **Full axe-core/Lighthouse accessibility audit, full cross-viewport
  responsive audit, and `prefers-reduced-motion` re-audit were not
  performed** — spot-checked by reading component code (Tailwind
  responsive/motion-reduce class usage present and consistent), not
  independently re-verified visually or with automated tooling this
  phase. See `docs/PRODUCTION_CHECKLIST.md`'s "NOT independently
  re-verified in a real browser this phase" section.
- **No CI/CD pipeline exists** (no `.github/workflows` or equivalent) —
  `docs/DEPLOYMENT.md` documents exactly which commands, in which order,
  a pipeline should run.
- **No error-tracking service, health-check endpoint, or alerting is
  wired in** — `docs/OBSERVABILITY.md` documents what exists today (the
  `audit_logs`/`order_status_history`/`payment_events` tables as the real
  durable record, plus `console.error` in the three error boundaries) and
  the recommended minimum before handling real payments.
- **No automated/managed database backup job is configured** —
  `docs/BACKUP_AND_MIGRATIONS.md` documents the strategy and manual
  `pg_dump`/`pg_restore` commands; wiring an actual scheduled job depends
  on whichever hosting provider is eventually chosen.
- Every carried-over item from Phases 6-13 remains outstanding and is
  unchanged by this phase (see the cumulative list above) — this phase
  added test coverage and documentation for existing behavior, it did not
  change checkout/cart/coupon/payment/order business logic itself.

Admin image upload defect fix adds:

- **Uploaded images are stored on local disk (`public/assets/`), not
  real object storage/CDN** — a deliberate, documented choice given no
  provider is configured (see "Important Assumptions" and the route's
  own header comment); will not survive a redeploy on an ephemeral
  filesystem or work behind more than one stateless instance without a
  shared volume.
- **No garbage collection of orphaned uploaded files** — replacing/
  removing an image leaves the old file on disk with nothing referencing
  it. Not a correctness/security issue, just a disk-usage cleanup task
  for later.
- **No image resizing/re-encoding on upload** — files are stored exactly
  as uploaded (up to 5 MB); `next/image` still optimizes how they're
  *served*, but a large source file is still a large source file at rest.
- **Real-browser click-through of all four admin forms' new
  browse-and-upload UI has not been done** — same sandbox limitation as
  every phase since Phase 7; see this fix's "Tests/checks" for exactly
  what real-HTTP verification substituted for it (the endpoint itself,
  including all rejection paths, was fully exercised over real HTTP).

## Next Session Instructions

**All 15 phases in CLAUDE_BUILD_INSTRUCTIONS.txt §D are now COMPLETE.**
There is no next numbered phase. This section now documents follow-up
work rather than "the next phase" — read it as a prioritized backlog, not
a single objective.

- **Most recent change to know about:** the three-level category system
  (see `## Completed` → "Change request — Three-level category system").
  If the store already has real products: run `npm run db:migrate`, then
  `npm run db:sync-categories`, then re-file the products it lists.
  With browser automation available, first click through the new
  header mega-menu (hover, Tab, Escape) and the mobile menu.
- **Exact next objective, in priority order:**
  1. **If browser automation is available in this session's environment,
     use it before anything else** — this is the single most valuable
     thing any future session can do, and no session in this project's
     history has ever had it available. In priority order once available:
     (a) verify Phase 14's new `useDialogA11y` focus trap
     (`CartDrawer`/`SearchOverlay`) actually behaves correctly with a
     real keyboard — Tab/Shift+Tab cycling, Escape, focus landing on open
     and returning to the trigger on close; (b) verify the CSP
     (`next.config.ts`) doesn't silently break hydration/interactivity
     anywhere (`npm run build && npm run start`, click through
     representative pages); (c) work through the accumulated backlog of
     "real browser/Server-Action-wire-protocol verification has not been
     done" items across every phase (see "Known Issues / Technical Debt"
     above for the full list — cart/wishlist, checkout/order placement,
     coupon/payment, admin forms, reviews/newsletter/support, Phase 14's
     own accessibility fix, and now this session's admin image-upload
     `<ImagePicker>` forms — click through selecting a real file on all
     four: hero slide, category, promo banner, product image); (d) install Playwright and
     implement the 12 critical flows from CLAUDE_BUILD_INSTRUCTIONS.txt
     Phase 14 as real E2E tests in `tests/e2e/` (still an empty
     placeholder), building on `tests/integration/helpers.ts`'s fixture
     patterns; (e) if time remains, implement the nonce-based strict CSP
     Phase 13 deferred (see that phase's finding #4 and
     `next.config.ts`'s header comment) and verify it in a real browser
     afterward.
  2. **If browser automation is still not available**, the highest-value
     work is closing items in `docs/PRODUCTION_CHECKLIST.md`'s BLOCKING
     section that don't require a browser: wiring a real Iranian payment
     gateway once credentials exist (replacing
     `src/domains/payments/provider.ts`'s mock — the adapter interface is
     already designed for this), a real SMS/OTP provider, replacing the
     placeholder shipping fees with real business figures, or starting
     the observability follow-ups in `docs/OBSERVABILITY.md` (external
     error tracking, a `/api/health` endpoint — neither needs a browser
     to build or to verify with `curl`).
  3. Whatever is picked, run `npm run typecheck && npm run lint && npm
     test && npm run test:integration && npm run build` after every
     change, same discipline as every phase before this one — this
     project's checks have never regressed and there's no reason to start
     now.
  4. Update `PROGRESS.md` with the same honesty this and every prior
     phase used — state plainly what changed, what was and wasn't
     verified, and whether anything above is now resolved. There is no
     more "which numbered phase is next" question to answer; the
     question going forward is "what does this specific business/
     technical gap need," per the backlog above and
     `docs/PRODUCTION_CHECKLIST.md`.
- Files/areas to inspect first: `docs/PRODUCTION_CHECKLIST.md` (the
  authoritative, itemized list of what's DONE vs. BLOCKING vs.
  PRE-LAUNCH — read this before anything else), `src/lib/hooks/
  useDialogA11y.ts` and the two components using it (highest-priority
  browser-verification target), `src/components/admin/ImagePicker.tsx`
  and `src/app/api/admin/media/route.ts` (this session's fix — real
  browser click-through of the four forms using it is the next-highest
  new item), `tests/e2e/` (empty — where a Playwright suite would go),
  `src/domains/payments/provider.ts` (where a real gateway adapter would
  be added, if credentials become available).
- **Is the project shippable?** Structurally and technically, yes — see
  Phase 14's write-up above for the full reasoning. Not yet shippable to
  accept real customer payments, for business/operational reasons (no
  real payment gateway, no real shipping rates, no legal review of policy
  pages) that are unrelated to code quality and are itemized exactly in
  `docs/PRODUCTION_CHECKLIST.md`.

## Commands

- install: `npm install`
- dev: `npm run dev` (or `npx next dev`)
- build: `npm run build` (or `npx next build`)
- start: `npm run start` (after build)
- lint: `npm run lint` (or `npx eslint .`)
- typecheck: `npm run typecheck` (or `npx tsc --noEmit`)
- test (unit, no database): `npm test` (or `npx vitest run tests/unit`)
- test (integration, needs a real migrated PostgreSQL — reads
  `DATABASE_URL` from `.env.local`): `npm run test:integration`
- test (both suites): `npm run test:all`
- test (watch mode, unit only): `npm run test:watch`
- db migration (generate): `npm run db:generate` (or
  `npx drizzle-kit generate`) — regenerates SQL from the current schema
  after editing files in `src/lib/db/schema/`.
- db migration (apply): `npm run db:migrate` (or `npx drizzle-kit migrate`)
  — applies pending migrations in `drizzle/migrations/` to `DATABASE_URL`.
- db studio (browse data): `npm run db:studio` (or `npx drizzle-kit studio`)
- sync categories (existing DB, non-destructive): `npm run db:sync-categories`
  — upserts the three-level taxonomy from
  `src/domains/categories/taxonomy.ts` and reports legacy categories /
  products needing re-filing; add `-- --deactivate-outside` to hide old
  categories. Never deletes or moves products.
- seed: `npm run db:seed` (or `npx tsx --env-file=.env.local src/lib/db/seed.ts`)
  — wipes and re-populates the catalog tables (the 191-category taxonomy
  + 11 demo products; before the category change: 6 flat categories) from
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
- Admin image uploads (hero/categories/banners/products, this session's
  fix) need no configuration — `POST /api/admin/media` (staff/admin only)
  writes straight to `public/assets/<folder>/` on local disk; no env var
  to set. `folder` must be one of `products`/`hero`/`categories`/
  `banners`.

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
support/content used only what Phases 1-11 already installed. **No new
dependencies were added in Phase 13 either** — the rate limiter and
security headers used only `next/headers`/`next.config.ts`, both already
part of the installed Next.js version. **Phase 14 added `vitest`
(^5.0.1) as the project's only new production/dev dependency** — no test
runner existed before this phase. `@vitejs/plugin-react` and
`vite-tsconfig-paths` were installed during setup and then removed once
`vitest.config.ts`'s built-in `resolve.tsconfigPaths: true` proved
sufficient on its own; final `package.json` reflects only `vitest` as new.

**Note for the next session's environment setup:** this sandbox's
Postgres service has now been observed to stop silently between separate
tool calls **in more than one session** (Phase 11 saw it once; Phase 12
saw it again, this time mid-build on `/contact`'s prerender with the same
`ECONNREFUSED 127.0.0.1:5432`; **Phase 13 saw it a third time, again
mid-build on `/contact`'s prerender, and again with the identical
`ECONNREFUSED` — this is now a confirmed, load-bearing part of how this
sandbox behaves, not a fluke**) — treat this as a real, recurring
characteristic of this sandbox, not a one-off. If a build or dev-server
command suddenly can't reach the database, always check
`service postgresql status` and `service postgresql start` again first
before assuming something in the code broke — this has been the actual
cause every time so far. Similarly, backgrounding `npm run start`/
`npm run dev` with a plain trailing `&` does not survive past the end of
that tool call in this sandbox — use
`setsid nohup <command> > /tmp/out.log 2>&1 < /dev/null &` (this
sandbox's `disown` is unavailable; `setsid`+`nohup` alone is sufficient)
if the next session needs a long-running server process to stay up for
`curl`-based HTTP verification across multiple tool calls; **Phase 13
also observed that a `setsid nohup`-backgrounded `next start` process
can still be killed between tool calls by something outside this
session's control (not just a plain `&`) — if `curl` suddenly returns
empty/`000` against a server that was working a moment ago, first check
`ps aux | grep next` and restart it rather than assuming the change just
made broke something.** Also note: prior phases (e.g. Phase 12) created
and dropped scratch databases for fresh-clone checks; Phase 13 instead
re-ran `db:migrate`/`db:seed` against the same already-migrated local
database (a `DROP DATABASE`/`CREATE DATABASE` attempt failed with
"database is being accessed by other users" from the still-running build/
server processes, and re-running migrate/seed against the existing
database is an equally valid idempotency check — see this phase's
"Tests/checks" for exactly what that confirmed). This session also used
temporary `scripts/tmp-*.ts` verification files that were deleted before
finishing — the next session should do the same (throwaway scripts, not
committed/delivered) rather than leaving verification code in the
repository.

**Phase 14 saw the same Postgres-stops-silently behavior a fourth time**
(mid-session, between unrelated tool calls, no code change triggered
it) — `service postgresql start` immediately fixed it, same as every
prior occurrence, and `npm run build` was simply re-run afterward. This
is now observed across four separate sessions (Phases 11, 12, 13, 14);
treat it as certain to recur, not merely likely. Phase 14 also
discovered leftover `trends-test-*` category/product rows in the local
database from an early, still-buggy version of its own integration test
cleanup (wrong FK deletion order caused an `afterAll` to throw partway
through) — cleaned up manually via `DELETE FROM products WHERE slug LIKE
'trends-test-product-%'` / same for `categories`, then confirmed the
fixed test suite tears down cleanly on repeated runs (verified by direct
`psql` row counts before/after, matching the seeded baseline exactly: 6
categories, 11 products). If a future session finds unexplained
`trends-test-*`-prefixed rows in a shared database, this is why, and the
same cleanup query works.

