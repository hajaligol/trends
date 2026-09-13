import { relations, sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { productVariants } from "./product-variants";
import { products } from "./products";

/**
 * One purchased line item, frozen at order-creation time. Unlike
 * `cart_items` (which deliberately stores no price and always reads
 * live from `product_variants`, see that file's header comment),
 * `order_items` **must** snapshot everything the customer paid for —
 * TRENDS_PROJECT_CONTEXT.md §6 "Orders" ("price snapshots", "discount
 * snapshots") and §14 ("Historical order data remains stable if
 * products/prices change").
 *
 * `productId`/`variantId` are kept as nullable references (not the
 * source of truth for display — the snapshot columns are) purely so an
 * admin UI (Phase 11) can still link back to the live product for
 * convenience; `onDelete: "set null"` so deleting a product/variant
 * later never cascades into deleting historical order data — an order
 * must survive its product being removed from the catalog entirely.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),

    // --- Snapshot fields: the actual source of truth for this line,
    // frozen at the moment the order was placed. ---
    productTitle: text("product_title").notNull(),
    productSlug: text("product_slug").notNull(),
    sku: text("sku").notNull(),
    size: text("size").notNull(),
    color: text("color").notNull(),
    imageUrl: text("image_url"),
    unitPriceToman: integer("unit_price_toman").notNull(),
    compareAtPriceToman: integer("compare_at_price_toman"),
    quantity: integer("quantity").notNull(),
    lineTotalToman: integer("line_total_toman").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check("order_items_unit_price_non_negative", sql`${table.unitPriceToman} >= 0`),
    check("order_items_line_total_non_negative", sql`${table.lineTotalToman} >= 0`),
  ],
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
