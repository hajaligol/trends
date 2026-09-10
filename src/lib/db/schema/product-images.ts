import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { productVariants } from "./product-variants";

/**
 * A product's gallery image. `variantId` is nullable and optional: most
 * images belong to the product as a whole, but some clothing products
 * need color-specific shots (a hoodie photographed in each color it comes
 * in) — when set, this image is scoped to that one variant/color instead
 * of showing for every variant.
 *
 * `url` is a plain string for now (Phase 3 seeds with local
 * `reference/prototype.html`-style paths under `public/assets`, per
 * TRENDS_PROJECT_CONTEXT.md's asset-slot content). Object storage/CDN
 * URLs (§3 Infrastructure) slot into the same column later without a
 * schema change — this table doesn't care whether `url` points at
 * `/assets/...` or a CDN host.
 */
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),
    url: text("url").notNull(),
    altText: text("alt_text").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_images_product_id_idx").on(table.productId),
    index("product_images_variant_id_idx").on(table.variantId),
  ],
);

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [productImages.variantId],
    references: [productVariants.id],
  }),
}));

export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
