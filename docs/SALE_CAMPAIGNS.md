# Sale campaigns («کمپین‌های فروش»)

Automatic, time-boxed offers an operator manages at **/admin/campaigns**. Unlike a
coupon the customer types nothing. Code: `src/domains/campaigns/`.

## Campaign types

| Group | Type (`kind`) | Behaviour |
|---|---|---|
| Price | `percent_off` | N% off each unit, optional per-unit cap |
| Price | `amount_off` | fixed Toman off each unit (never below 0) |
| Price | `fixed_price` | unit sells at a fixed price (never raises a price) |
| Cart | `buy_x_get_y_free` | per group of X+Y units, the Y cheapest are free |
| Cart | `buy_x_get_y_percent` | per group of X+Y, the Y cheapest get N% off |
| Cart | `bundle_price` | every N units cost a fixed price (only if cheaper) |
| Cart | `tiered_discount` | N% by quantity or amount reached (up to 6 tiers, optional cap) |
| Cart | `basket_discount` | spend ≥ X → N% or fixed amount off eligible lines (optional cap) |
| Shipping | `free_shipping` | waives shipping (standard; express optional), optional min spend |

*Price* campaigns change the displayed price everywhere (cards, listing, search, product
page, JSON-LD). *Cart* campaigns show as a note/tag on products and are applied in the cart
and at checkout.

## Scope

Explicit: **whole store**, or the union of selected **brands**, **categories** (a category
includes all its sub-categories) and **products**, minus **excluded products**. A campaign
that is not store-wide and has no include target is rejected (no accidental store-wide sale).

## Evaluation rules (`engine.ts`, pure, integer-only)

1. **Price-level**: per line the campaign giving the lowest price wins (tie → older). They never compound.
2. **Cart-level**: greedy — repeatedly apply the campaign that saves the customer most on the units still available, until none saves anything. Each campaign applies once.
3. **Free shipping**: judged last on what eligible lines actually cost.

**Stacking**: a unit already discounted by campaign A can join campaign B only if **both** are
marked *stackable* (default off ⇒ sale items are excluded from other offers).
Percentages floor; multi-unit discounts are split by largest remainder so parts sum exactly.

**Coupons** apply to the *post-campaign* subtotal; coupon rules are unchanged.

## Where prices are decided

`getCartSummary` and `createOrderFromCart` both call `evaluateCart` with campaigns loaded
from the database (`loadActiveCampaigns`, config re-validated with Zod; invalid rows are
ignored and logged). Order creation re-runs it **inside the transaction** and re-resolves the
shipping fee itself — the client/cart view is never trusted. Catalog pages use the same
campaigns for display only.

## Order snapshots

- `order_items.unit_price_toman` = regular price; `campaign_discount_toman`, `campaign_label`; `line_total_toman` = paid.
  DB check: `line_total = unit_price × quantity − campaign_discount` (added `NOT VALID`, so legacy rows are untouched; enforced for all new rows).
- `orders.subtotal_toman` = items total **after** campaigns; `campaign_discount_toman`, `shipping_discount_toman` for reporting.
- `order_campaign_applications`: per-campaign discount snapshot (`campaign_id` is `SET NULL` if the campaign is deleted).

## Admin UX

One page, five steps: type cards → only the fields that type needs → scope pickers (brand chips,
category tree, product search, exclusions) → schedule (Tehran time, UTC+03:30 fixed) → name/rules.
A sticky side panel shows a plain-language summary and a **live preview** (how many products are
covered, sample before/after prices, overlap with other live campaigns). List page: status
(live/scheduled/ended/paused), results (orders + discount given), on/off switch, duplicate (as paused), delete.
All actions are role-checked, validated server-side and audit-logged (`campaign.*`).

## Caching

Product, category, collection and search pages are dynamic. The homepage is static with
`revalidate = 60`; saving a campaign also calls `revalidatePath("/", "layout")`. A displayed
sale price can therefore lag a campaign boundary by ≤ 1 minute on the homepage; the cart and
checkout always price from the database.

## Not included (deliberately)

Gift-with-purchase (needs automatic stock-reserved gift lines), per-campaign unit caps
("first 100 units"), audience targeting (logged-in only / first order), per-campaign coupon
exclusion, scheduled recurring campaigns. Each is additive on the current model.
