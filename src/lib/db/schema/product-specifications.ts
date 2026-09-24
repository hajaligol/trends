import { relations, sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";

/**
 * Admin-authored rows of a product's «مشخصات محصول» table (label → value,
 * e.g. «قد مدل» → «۱۸۵ سانتی‌متر»). These are *custom* rows only: brand,
 * category, material, sizes, colors and tags are still derived live from
 * the product/variants and shown automatically (see `ProductSpecs.tsx`).
 * A custom row whose label equals a derived row's label replaces that
 * row's value, which is how an admin overrides an automatic row.
 *
 * Purely descriptive — nothing here affects price, stock or checkout.
 * Saved as a whole set per product (delete + insert in one transaction),
 * so `display_order` is simply the row's position in the admin's list.
 * Uniqueness of `(product_id, label)` and the length limits are enforced
 * by the database, not just by the form validation.
 */
export const productSpecifications = pgTable(
  "product_specifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    value: text("value").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_specifications_product_order_idx").on(table.productId, table.displayOrder),
    unique("product_specifications_product_label_unique").on(table.productId, table.label),
    check("product_specifications_label_length", sql`char_length(btrim(${table.label})) between 1 and 80`),
    check("product_specifications_value_length", sql`char_length(btrim(${table.value})) between 1 and 500`),
  ],
);

export const productSpecificationsRelations = relations(productSpecifications, ({ one }) => ({
  product: one(products, {
    fields: [productSpecifications.productId],
    references: [products.id],
  }),
}));

export type ProductSpecification = typeof productSpecifications.$inferSelect;
