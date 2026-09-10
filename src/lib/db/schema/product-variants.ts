import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { products } from "./products";

/**
 * A purchasable size/color/material combination of a product. This is
 * where price and stock actually live — see the comment on `products`.
 *
 * Money: `priceToman`/`compareAtPriceToman` are integers, never floats.
 * Toman (not Rial) is this store's canonical unit — per
 * TRENDS_PROJECT_CONTEXT.md §5 ("make the application's canonical money
 * unit explicit"), Iranian retail pricing has no sub-Toman fraction in
 * practice, so an integer Toman value is already the smallest unit this
 * business ever charges; there is no hidden Rial precision being
 * discarded. If a future payment gateway integration (Phase 9) requires
 * Rial, that conversion (× 10) happens at the gateway adapter boundary,
 * not here — see §5 "Convert to the payment gateway's required unit at
 * the integration boundary."
 *
 * `stock` here is a simple on-hand count for Phase 3/4 catalog display
 * (in-stock/low-stock/out-of-stock badges, no overselling in the trivial
 * sense). Reserved-stock tracking, inventory movement/audit trail, and
 * concurrency-safe decrement-on-checkout are explicitly Phase 8 work
 * (TRENDS_PROJECT_CONTEXT.md §6 "Inventory" / §8 "Checkout") — adding a
 * full inventory-movement ledger now would be scope creep for a phase
 * whose acceptance criteria only ask for catalog data + queries.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    size: text("size").notNull(),
    color: text("color").notNull(),
    colorHex: text("color_hex"),
    material: text("material"),
    priceToman: integer("price_toman").notNull(),
    compareAtPriceToman: integer("compare_at_price_toman"),
    stock: integer("stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_variants_sku_idx").on(table.sku),
    uniqueIndex("product_variants_product_size_color_idx").on(
      table.productId,
      table.size,
      table.color,
    ),
    index("product_variants_product_id_idx").on(table.productId),
    check("product_variants_price_non_negative", sql`${table.priceToman} >= 0`),
    check(
      "product_variants_compare_at_price_non_negative",
      sql`${table.compareAtPriceToman} is null or ${table.compareAtPriceToman} >= 0`,
    ),
    check("product_variants_stock_non_negative", sql`${table.stock} >= 0`),
  ],
);

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
