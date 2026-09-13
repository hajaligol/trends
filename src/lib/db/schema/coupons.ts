import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { couponRedemptions } from "./coupon-redemptions";

/**
 * TRENDS_PROJECT_CONTEXT.md §6 "Promotions" — percentage/fixed discount,
 * minimum basket, start/end time, usage limit, per-customer usage limit,
 * active/inactive. "Stacking rules" is satisfied trivially: `orders` has
 * exactly one `couponId`/`couponCode` column, so at most one coupon can
 * ever apply to an order — coupons never stack with each other. No
 * category/product-restriction columns yet (§6 says "where useful"; the
 * catalog has no such requirement documented) — `isActive` +
 * `startsAt`/`endsAt` cover this phase's real scope; a
 * `coupon_category_restrictions`/`coupon_product_restrictions` join table
 * could be added later without touching this table's shape.
 */
export const couponDiscountTypeEnum = pgEnum("coupon_discount_type", ["percentage", "fixed"]);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Stored upper-cased (see promotions/queries.ts) so lookups are
    // case-insensitive without a functional index.
    code: text("code").notNull(),
    discountType: couponDiscountTypeEnum("discount_type").notNull(),
    /** Percentage: 1-100. Fixed: integer Toman. Which one this means is
     * determined by `discountType` — see the check constraint below. */
    discountValue: integer("discount_value").notNull(),
    /** Order subtotal (pre-shipping, pre-discount) must be at least this
     * to redeem. `0` means no minimum. */
    minBasketToman: integer("min_basket_toman").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** `null` = unlimited total redemptions. */
    usageLimit: integer("usage_limit"),
    /** `null` = unlimited redemptions per customer. */
    perCustomerLimit: integer("per_customer_limit").default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("coupons_code_idx").on(table.code),
    check(
      "coupons_discount_value_valid",
      sql`(${table.discountType} = 'percentage' AND ${table.discountValue} BETWEEN 1 AND 100) OR (${table.discountType} = 'fixed' AND ${table.discountValue} > 0)`,
    ),
    check("coupons_min_basket_non_negative", sql`${table.minBasketToman} >= 0`),
    check("coupons_usage_limit_positive", sql`${table.usageLimit} IS NULL OR ${table.usageLimit} > 0`),
    check(
      "coupons_per_customer_limit_positive",
      sql`${table.perCustomerLimit} IS NULL OR ${table.perCustomerLimit} > 0`,
    ),
  ],
);

export const couponsRelations = relations(coupons, ({ many }) => ({
  redemptions: many(couponRedemptions),
}));

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
