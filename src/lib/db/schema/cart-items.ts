import { relations, sql } from "drizzle-orm";
import { check, index, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { carts } from "./carts";
import { productVariants } from "./product-variants";

/**
 * A single line item in a cart: one product **variant** (never a bare
 * product — you can't add "a T-shirt" to a cart, only "a T-shirt, size
 * M, black", per TRENDS_PROJECT_CONTEXT.md §6 "Product model" / "Cart"
 * — "variant-aware items") plus a quantity.
 *
 * This table intentionally does **not** store a copy of the variant's
 * price. TRENDS_PROJECT_CONTEXT.md §4.3 ("Server is authoritative") and
 * §6 ("price recalculation") mean a cart's displayed/total price is
 * always read live from `product_variants.price_toman` at query time
 * (`src/domains/cart/queries.ts`'s `getCartSummary`), not a snapshot —
 * that's what makes "price refresh" real instead of stale. Order
 * *snapshots* (immutable, purchase-time copies) are a deliberately
 * different concept for Phase 8's `orders`/`order_items` tables, where
 * freezing the price at the moment of purchase is exactly the point.
 *
 * `uniqueIndex(cartId, variantId)` enforces "one row per variant per
 * cart" at the database level, not just in application code (rule F.3 —
 * "prefer PostgreSQL constraints over application-only checks") — adding
 * the same variant twice increments `quantity` on the existing row
 * (`ON CONFLICT DO UPDATE`) rather than creating a duplicate.
 */
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_items_cart_id_variant_id_idx").on(table.cartId, table.variantId),
    index("cart_items_cart_id_idx").on(table.cartId),
    index("cart_items_variant_id_idx").on(table.variantId),
    check("cart_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
