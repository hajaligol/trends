import { relations } from "drizzle-orm";
import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { coupons } from "./coupons";
import { users } from "./users";
import { orders } from "./orders";

/**
 * One row per successful coupon application, written in the same
 * transaction as the order it applied to (`createOrderFromCart`,
 * `src/domains/orders/queries.ts`). This is what usage-limit and
 * per-customer-limit checks actually count against — never a counter
 * column on `coupons` that could drift, and never trusted from the
 * client (rule §4.3).
 *
 * `uniqueIndex(orderId)` — a given order can have at most one redemption
 * row, matching "coupons never stack" (see `coupons.ts`'s header
 * comment) and making the redemption idempotent if `createOrderFromCart`
 * were ever retried for the same order (it isn't today, but the
 * constraint costs nothing and prevents a future bug from double
 * counting).
 */
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("coupon_redemptions_order_id_idx").on(table.orderId),
    index("coupon_redemptions_coupon_id_idx").on(table.couponId),
    index("coupon_redemptions_coupon_user_idx").on(table.couponId, table.userId),
  ],
);

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, { fields: [couponRedemptions.couponId], references: [coupons.id] }),
  user: one(users, { fields: [couponRedemptions.userId], references: [users.id] }),
  order: one(orders, { fields: [couponRedemptions.orderId], references: [orders.id] }),
}));

export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type NewCouponRedemption = typeof couponRedemptions.$inferInsert;
