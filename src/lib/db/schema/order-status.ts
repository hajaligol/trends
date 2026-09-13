import { pgEnum } from "drizzle-orm/pg-core";

/**
 * An explicit, validated order lifecycle (TRENDS_PROJECT_CONTEXT.md §6
 * "Orders" — "should be explicit and validated, not arbitrary strings"),
 * not a free-text status column.
 *
 * Extracted into its own module (rather than living in `orders.ts`,
 * where it originated in Phase 8) so `order-status-history.ts` (Phase
 * 10) can reference it without a circular import: `orders.ts` needs
 * `orderStatusHistory` (for its `relations()` call) and
 * `order-status-history.ts` needs `orderStatusEnum` — two files each
 * needing something from the other. `order-items.ts`/`orders.ts` have
 * tolerated exactly this shape since Phase 8 because their circular
 * reference is only inside a deferred `relations()` callback; this
 * enum, by contrast, is used directly at module-evaluation time inside
 * `pgTable()`'s column definitions in *both* files, which a true
 * circular `require` cannot resolve (confirmed: `drizzle-kit generate`
 * threw `ReferenceError: Cannot access 'orderStatusEnum' before
 * initialization` before this file existed). A shared leaf module both
 * import from is the standard fix for this class of cycle.
 *
 * `pending_payment -> paid` is driven by Phase 9's payment callback
 * (`finalizePaymentVerification`); `pending_payment/paid/processing ->
 * cancelled` by the customer (`cancelOrderForUser`) or an admin/staff
 * user (`adminTransitionOrderStatus`); `processing -> shipped ->
 * delivered` and `cancelled -> refunded` by an admin/staff user only —
 * see `src/domains/orders/lifecycle.ts` for the full, validated
 * transition table (Phase 10). Every transition is recorded in
 * `order_status_history` in the same transaction that changes this
 * column, so the two can never drift.
 */
export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);
