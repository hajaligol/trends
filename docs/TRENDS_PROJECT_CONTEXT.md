# Trends — Production E-commerce Project Context

## 1. Mission

Build **Trends (ترندز)** from the supplied prototype into a real, production-ready Iranian online clothing store.

The goal is not to make a nicer prototype. The goal is to create a maintainable application that can eventually handle real customers, real inventory, real orders, real payments, and real operational administration.

Primary requirements:

- Persian-first and RTL.
- Same visual/design language as the supplied prototype.
- Fast initial load and good Core Web Vitals.
- Secure by default.
- Scalable without premature microservices.
- SEO-friendly.
- Accessible.
- Fully responsive from small phones to large desktop screens.
- Production-grade data model and business rules.
- Easy to operate by a non-developer through an admin area.
- Architecture should leave room for a future React Native/Expo app, but **do not build the mobile app now**.

Do not replace the prototype's design with a generic dashboard/e-commerce template.

---

## 2. Source of truth: supplied prototype

The user supplied the latest prototype as `index.html`. Treat its visual language as the design reference.

Important prototype characteristics:

- HTML document is Persian and `dir="rtl"`.
- Warm off-white page background.
- Dark blue/ink primary text.
- Soft pastel category/banner colors.
- Rounded cards and pill-shaped CTAs.
- Minimal, editorial fashion-store aesthetic.
- Sticky header.
- Desktop navigation and mobile navigation drawer.
- Hero image carousel with dots, arrows, autoplay, swipe/drag.
- Category circles.
- Featured product grid.
- Women/men promotional banners.
- New-arrivals grid.
- Benefits/trust strip.
- Newsletter area.
- Footer/social area.
- Search overlay.
- Cart drawer.
- Wishlist toggles.
- Responsive breakpoints around desktop/tablet/mobile.
- Reduced-motion consideration.
- Visible keyboard focus styling.
- Product/category/banner images are represented by asset slots and WebP assets.
- Current product/cart/newsletter behavior is demo-only and must become real application behavior.

The prototype currently contains hardcoded examples such as:
- پیراهن کلاسیک
- بافت زنانه
- کتانی مینیمال
- هودی روزانه
- پالتو ترنج
- کوله پشتی
- کلاه کلاسیک
- شلوار پارچه‌ای
- هودی
- کت جین
- تیشرت ساده

These are seed/demo content, not permanent business requirements.

Prototype design tokens include approximately:
- background `#FBF9F5`
- header `#F6F3EE`
- ink `#182630`
- secondary text `#566066`
- hero beige `#F1E9DF`
- pastel blue `#AAD0E2`
- pastel pink `#EFC8CA`
- sage `#D2D9BF`
- blush `#FADBD8`
- lavender `#E2D4EC`
- aqua `#B5D6CF`
- yellow `#FBE1B4`
- benefit background `#F1F3EC`
- card image background `#F1ECE3`
- radii roughly 8 / 14 / 22 / pill
- Vazirmatn/Tahoma/Segoe UI fallback family
- maximum content width around 1240px

Preserve the spirit and hierarchy of these choices. You may refine them for accessibility, consistency, responsive behavior, and production quality.

---

## 3. Target technology stack

Use this stack unless there is a strong technical reason to change it. If you believe a change is necessary, document the reason in the progress report before making it.

### Core
- Next.js
- React
- TypeScript
- App Router
- Server Components by default
- Client Components only where interaction/state requires them

### Styling
- Tailwind CSS
- CSS modules/global CSS only where Tailwind is awkward or where design-system CSS is genuinely clearer
- Preserve the prototype's design tokens

### Server/data
- Next.js server-side capabilities
- Server Actions for suitable mutations/forms
- Route Handlers for endpoints/integrations where appropriate
- PostgreSQL
- Drizzle ORM
- Zod (or an equally strong schema-validation library) for server-side validation

### Authentication
Use a mature authentication/session solution rather than inventing authentication from scratch.
Authentication must support:
- customer accounts
- secure sessions
- logout
- password reset/recovery where applicable
- Iranian mobile number support
- optional email
- verification/OTP architecture that can later connect to an SMS provider
- role-based authorization for staff/admin
- secure handling of secrets

Do not store authentication tokens in localStorage.

### Infrastructure
- Object storage for product/media files
- CDN for public media
- Redis only when a concrete need exists (rate limiting, caching, jobs, sessions, etc.)
- Managed PostgreSQL
- CDN/edge-capable deployment
- Environment variables for secrets and provider configuration

### Future mobile
Do not implement now. Keep domain logic, validation, API contracts, and database design clean enough that a future React Native/Expo client can use the same backend.

---

## 4. Architectural principles

### 4.1 Start as a modular monolith

Do NOT create microservices.

Organize the code by business/domain responsibility so the application can later be split if real scale requires it.

Suggested domain boundaries:

- catalog
- categories
- products
- product variants
- inventory
- customers
- authentication
- wishlist
- cart
- checkout
- addresses
- orders
- payments
- shipping
- promotions/coupons
- reviews
- notifications
- content/CMS-like storefront content
- newsletter
- support
- admin
- analytics/audit

### 4.2 Separate concerns

Prefer a structure in which:
- UI components do not contain database logic.
- Server Actions/Route Handlers do not become giant business-logic files.
- Database access is isolated.
- Domain services enforce business rules.
- Validation schemas are reusable.
- Shared types are derived from the schema/domain where practical.

### 4.3 Server is authoritative

Never trust values coming from the browser for:
- price
- discount
- stock
- product ownership
- user ID
- role
- shipping cost
- tax/fee
- coupon validity
- order total
- payment status

At checkout, recalculate everything server-side from authoritative database state.

---

## 5. Iranian store requirements

The application is intended for the Iranian market. Design the domain so provider-specific details are configurable.

### Money
- Support تومان/Rial display correctly.
- Store monetary values as integer minor/base units, never floating point.
- Make the application's canonical money unit explicit in the code/database.
- Convert to the payment gateway's required unit at the integration boundary.
- Use Persian digit formatting in the UI where appropriate.
- Avoid mixing raw numeric strings and formatted currency strings in business logic.

### Phone
- Support Iranian mobile numbers.
- Normalize numbers to a canonical format before storing/comparing.
- Never assume a single formatting style from user input.

### Address
Support Iranian shipping addresses with suitable fields, such as:
- recipient name
- mobile
- province
- city
- address
- postal code
- optional plaque/unit/details
- delivery notes

Do not assume foreign address models are sufficient.

### Shipping
Create a shipping abstraction supporting:
- shipping methods
- shipping fee
- free-shipping threshold
- estimated delivery information
- serviceability rules
- order shipping snapshot

The order must retain the shipping information used at purchase time even if the customer's address changes later.

### Payment
Create a payment-provider interface/adapter layer.

Do not hard-code business logic around one gateway.

The system must support:
- payment initiation
- redirect/return
- callback/webhook verification where the provider supports it
- transaction/reference identifiers
- idempotency
- pending/success/failure states
- verification before marking an order paid
- reconciliation-friendly records

Never trust the browser return page as proof of payment.

Do not store raw card details.

Keep gateway secrets server-side.

### Iranian provider readiness
The implementation should be provider-agnostic enough to connect later to the chosen Iranian gateway. A real provider can be configured through environment variables and an adapter.

Do not fabricate gateway credentials or pretend a payment provider is live.

---

## 6. Commerce feature scope

The finished website should include the normal feature set expected from a serious online clothing store.

### Storefront
- Home page
- Men category
- Women category
- Shoes
- Accessories
- Hats/caps
- Sunglasses
- Other categories/subcategories
- Product listing pages
- Product detail pages
- Search
- Filtering
- Sorting
- Pagination or efficient infinite loading
- Breadcrumbs
- Related products
- New arrivals
- Featured products
- Promotional collections
- Sale/discount products
- Wishlist
- Cart
- Checkout
- Order success/failure/pending states
- Account area
- Order history
- Order detail/tracking status
- Address book
- Profile settings
- Password/account security
- Newsletter subscription
- Contact/support
- FAQ
- About
- Shipping policy
- Returns/refund policy
- Privacy policy
- Terms
- Error pages
- 404
- useful empty states
- useful loading states

### Product model
A product should support, as appropriate:
- title
- slug
- short description
- long description
- brand
- category
- tags
- SKU
- variants
- size
- color
- material
- price
- compare-at/original price
- sale price/discount
- stock
- low-stock state
- images
- image alt text
- gallery ordering
- active/inactive
- featured
- new arrival
- sale
- SEO title/description
- related products
- created/updated timestamps

Use variants for combinations such as color/size rather than pretending one product has one universal stock number.

### Inventory
Support:
- per-variant stock
- reserved stock
- available stock
- stock adjustments
- inventory movement/audit trail
- low-stock threshold
- out-of-stock handling
- concurrency-safe stock decrement/reservation

Avoid overselling under concurrent checkout requests.

### Cart
Support:
- guest cart
- authenticated cart
- add/remove
- quantity update
- variant selection
- stock validation
- price recalculation
- coupon application
- shipping estimate
- merge guest cart into user cart after login
- persistent cart where appropriate
- clear cart
- abandoned-cart-friendly architecture

### Wishlist
Support:
- add/remove
- authenticated persistence
- sensible guest behavior
- duplicate prevention
- product availability awareness

### Checkout
Support:
1. cart review
2. customer information
3. shipping address
4. shipping method
5. coupon/promotion
6. order summary
7. payment
8. result/confirmation

Do not allow client-provided totals.

### Orders
Support:
- human-friendly order number
- internal ID
- order status
- payment status
- fulfillment/shipping status
- item snapshots
- price snapshots
- discount snapshots
- shipping snapshot
- customer snapshot as appropriate
- timestamps
- notes/internal notes
- cancellation rules
- return/refund state architecture
- audit trail

Recommended high-level order lifecycle should be explicit and validated, not arbitrary strings.

### Promotions
Support:
- coupon codes
- percentage discount
- fixed discount
- minimum basket
- start/end time
- usage limit
- per-customer usage limit
- active/inactive
- category/product restrictions where useful
- stacking rules
- server-side validation

### Reviews
If enabled:
- verified purchase indicator
- rating
- text
- moderation status
- customer ownership checks
- duplicate/review abuse controls
- admin moderation

### Notifications
Design an extensible notification layer for:
- order confirmation
- payment result
- order status
- shipping status
- password/account events
- promotional/newsletter messages

Email/SMS provider integrations can be implemented behind adapters.

---

## 7. Admin/operations scope

A real store needs an admin surface.

Build an authenticated admin area with role-based permissions.

At minimum:
- dashboard overview
- products CRUD
- product variants
- categories
- inventory
- orders
- customers
- coupons/promotions
- reviews/moderation
- homepage promotional content
- hero slides
- newsletter subscribers
- basic site settings
- shipping settings
- payment settings/configuration status
- audit log

Admin must not rely on hidden UI alone for authorization. Every privileged operation must be authorized server-side.

Prefer explicit roles/permissions over one boolean "isAdmin" when the architecture can support it cleanly.

---

## 8. SEO and discoverability

The store should be SEO-ready from the beginning.

Include:
- semantic HTML
- metadata per page
- canonical URLs
- Open Graph metadata
- product metadata
- sitemap
- robots rules
- clean slugs
- indexability controls
- breadcrumbs
- structured data where appropriate
- no accidental indexing of private/account/admin pages
- correct language/locale metadata
- useful product titles/descriptions
- server-rendered content for important storefront pages

Do not expose internal IDs unnecessarily in public URLs.

---

## 9. Performance requirements

Performance is a first-class requirement.

Prefer:
- Server Components by default
- static/ISR-like rendering where appropriate
- dynamic rendering only when needed
- streaming/loading states where useful
- minimal client JavaScript
- `next/image` or equivalent optimized image handling
- responsive image sizes
- modern image formats
- explicit dimensions/aspect ratios to prevent layout shift
- lazy loading for below-the-fold media
- optimized fonts
- code splitting
- no unnecessary animation libraries
- no giant UI frameworks
- pagination for large datasets
- indexed database queries
- no N+1 queries
- caching/revalidation where appropriate
- CDN delivery for media

Do not add Redis merely because "scalable apps use Redis." Add it only for a measured/identified need.

---

## 10. Accessibility

Target strong practical accessibility:
- keyboard navigation
- visible focus states
- semantic buttons/links
- correct form labels
- accessible dialogs/drawers
- `aria-*` only when needed
- color contrast
- reduced motion
- screen-reader-friendly error messages
- proper headings
- alt text
- touch targets
- RTL correctness

The prototype already has some focus and reduced-motion behavior; preserve and improve it.

---

## 11. Security baseline

Use a defense-in-depth approach.

Required:
- server-side authorization
- server-side input validation
- parameterized ORM/database access
- secure sessions
- HttpOnly/Secure/SameSite cookies where applicable
- CSRF protections appropriate to the chosen architecture
- rate limiting for sensitive/public abuse-prone endpoints
- brute-force protection
- safe password hashing through a mature solution
- secrets only in environment/secret storage
- no secrets in source control
- safe error messages
- security headers
- CSP where practical
- HTTPS in production
- safe file upload rules
- upload size/type/content validation
- safe filenames/object keys
- no arbitrary file execution
- audit logs for sensitive admin actions
- reauthentication/step-up checks for high-risk account changes when appropriate
- idempotency for payment/order-sensitive operations
- transaction boundaries for critical commerce mutations
- concurrency-safe inventory operations
- dependency updates and vulnerability review

Never:
- trust client price
- trust client stock
- trust client role
- trust client payment status
- store card numbers/CVV
- store auth tokens in localStorage
- expose server secrets to client bundles
- use `dangerouslySetInnerHTML` casually
- disable security checks to "make it work"

---

## 12. Data model direction

A reasonable starting schema should include entities along these lines:

- users
- accounts/auth identities if required by auth solution
- sessions
- verification tokens/OTP records as required
- roles/permissions
- addresses
- categories
- products
- product_variants
- product_images
- product_attributes / variant attributes where needed
- inventory_items
- inventory_movements
- carts
- cart_items
- wishlists
- wishlist_items
- coupons
- coupon_redemptions
- orders
- order_items
- order_status_history
- payments
- payment_events
- shipments
- reviews
- newsletter_subscribers
- hero_slides/promotional_content
- notifications
- audit_logs
- site_settings

Do not blindly create every table. Use the simplest schema that fully represents the requirements and document important tradeoffs.

All timestamps should be stored consistently (prefer UTC internally) and formatted for Iran in the UI.

---

## 13. UX expectations

The site should feel like a polished Persian fashion brand, not an admin-generated storefront.

Maintain:
- generous whitespace
- restrained typography
- soft pastel accents
- rounded surfaces
- editorial product presentation
- subtle transitions
- strong visual hierarchy
- RTL-first spacing and alignment
- mobile usability

Do not:
- introduce a generic blue/purple SaaS palette
- replace the design with Material UI defaults
- create dense dashboards for customer-facing pages
- overuse shadows
- add unnecessary gradients
- make every element animated

Admin UI may be denser and more utilitarian, but should still use a coherent Trends design system.

---

## 14. Prototype-to-production migration rules

The prototype is a visual/interaction reference, not an implementation to copy line-for-line.

Replace:
- hardcoded products -> database
- hardcoded cart -> real cart
- demo wishlist -> persistent wishlist
- search overlay only -> real search
- fake newsletter submission -> real subscription
- fake buttons -> real routes/actions
- asset placeholders -> real media system
- static pricing -> database-backed pricing
- static stock -> inventory
- static navigation anchors -> routes
- inline JS -> React/Next.js components
- global ad-hoc CSS -> design system/tokens

Preserve:
- visual composition
- color language
- typography character
- spacing feel
- rounded geometry
- section hierarchy
- interaction intent
- responsive behavior
- Persian/RTL presentation

---

## 15. Definition of done

A phase is complete only when:
- requested functionality is implemented
- the app runs
- TypeScript is clean
- lint/type checks pass where configured
- relevant tests pass
- no obvious console/runtime errors remain
- responsive behavior is checked
- RTL behavior is checked
- accessibility is considered
- security implications are considered
- database migrations are valid if schema changed
- no secrets were committed
- the progress report is updated

The project is complete only when a fresh clone can be installed, configured, migrated, seeded (where appropriate), tested, and run using documented commands.

