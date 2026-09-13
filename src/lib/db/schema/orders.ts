import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { orderItems } from "./order-items";
import { coupons } from "./coupons";
import { orderStatusHistory } from "./order-status-history";
import { orderStatusEnum } from "./order-status";

/**
 * A placed order. Everything a customer saw at checkout time —
 * shipping address, shipping method/fee, and (via `order_items`) each
 * line's price — is copied onto this row/its items as an immutable
 * snapshot, never a foreign key to `addresses`/`product_variants`.
 * TRENDS_PROJECT_CONTEXT.md §5 "Shipping" and §6 "Orders" both require
 * this: a customer's address book row or a product's price can change
 * after the order ships, and the order must not silently change with it
 * (rule "Historical order data remains stable if products/prices
 * change").
 *
 * `orderNumber` is the human-friendly identifier shown to the customer
 * (§8 "human-friendly order number") — a short, sequential-looking but
 * unpredictable code, distinct from the internal `id` (§6 "Do not expose
 * internal IDs unnecessarily in public URLs" — `orderNumber` is what
 * appears in `/order/[orderNumber]`, not the uuid).
 *
 * Money fields are integer Toman, matching `product_variants` (rule
 * "Money: never use JavaScript floating point ... Store integers").
 * `subtotalToman + shippingFeeToman - discountToman = totalToman` is
 * enforced by application code at order-creation time, not a DB
 * constraint (Postgres check constraints can't easily reference other
 * columns' arithmetic across a join-free single row safely with nullable
 * discount handling here, and the invariant only needs to hold at
 * INSERT time since these columns are otherwise immutable post-creation).
 * `discountToman` defaults to `0` — real coupon application is Phase 9;
 * the column exists now so Phase 9 doesn't need a migration to add it.
 *
 * No `userId`-less (guest) orders exist yet — checkout requires a signed
 * in customer this phase, since the address book (`addresses` table) is
 * itself authenticated-only (Phase 6). Documented as an assumption in
 * PROGRESS.md, not silently invented: a guest-checkout address model is
 * a real, separate feature, not a natural side effect of this phase.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: text("order_number").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("pending_payment"),

    // --- Shipping address snapshot (copied from `addresses` at checkout
    // time — see the file header comment on why this isn't a FK) ---
    recipientName: text("recipient_name").notNull(),
    recipientMobile: text("recipient_mobile").notNull(),
    province: text("province").notNull(),
    city: text("city").notNull(),
    addressLine: text("address_line").notNull(),
    postalCode: text("postal_code").notNull(),
    plaqueUnitDetails: text("plaque_unit_details"),
    deliveryNotes: text("delivery_notes"),

    // --- Shipping method snapshot ---
    shippingMethodCode: text("shipping_method_code").notNull(),
    shippingMethodLabel: text("shipping_method_label").notNull(),
    shippingEstimateLabel: text("shipping_estimate_label").notNull(),

    // --- Money snapshot (integer Toman, see header comment) ---
    subtotalToman: integer("subtotal_toman").notNull(),
    shippingFeeToman: integer("shipping_fee_toman").notNull(),
    discountToman: integer("discount_toman").notNull().default(0),
    totalToman: integer("total_toman").notNull(),

    // --- Coupon snapshot (Phase 9). `couponId` is a nullable FK purely
    // for admin convenience link-back (`onDelete: "set null"` — see
    // `order-items.ts`'s header comment for the identical rationale);
    // `couponCode` is the actual source of truth for what's displayed,
    // since a coupon row can be edited/deleted after the order that used
    // it still exists. Both are `null` when no coupon was applied. ---
    couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    couponCode: text("coupon_code"),

    // --- Fulfillment (Phase 10). `trackingNumber` is a plain free-text
    // field, not a carrier-API integration — CLAUDE_BUILD_INSTRUCTIONS.txt
    // Phase 10 explicitly calls a simple column enough for this phase
    // ("no real carrier API integration is expected yet"). `cancelReason`/
    // `cancelledAt` are set only by `cancelOrderForUser`/
    // `adminTransitionOrderStatus` (`src/domains/orders/queries.ts`) when
    // a transition into `cancelled` happens; both stay `null` for an
    // order that was never cancelled. ---
    trackingNumber: text("tracking_number"),
    cancelReason: text("cancel_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    customerNote: text("customer_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    index("orders_user_id_idx").on(table.userId),
    check("orders_subtotal_non_negative", sql`${table.subtotalToman} >= 0`),
    check("orders_shipping_fee_non_negative", sql`${table.shippingFeeToman} >= 0`),
    check("orders_discount_non_negative", sql`${table.discountToman} >= 0`),
    check("orders_total_non_negative", sql`${table.totalToman} >= 0`),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
