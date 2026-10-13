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
 * A product's gallery image.
 *
 * `color` scopes an image to one colour of the product (it holds the same
 * text as `product_variants.color`, e.g. «مشکی»). Variants are size×colour
 * combinations, so a photo of the black hoodie belongs to *the colour*, not
 * to any single size — one upload covers every black size. When `color` is
 * null the image is "shared": it is shown only for colours that have no
 * photos of their own (see `domains/catalog/gallery.ts`).
 *
 * `variantId` is the legacy per-variant scope from Phase 3. It is no longer
 * written or read; migration 0014 copied each value into `color`. The
 * column is kept (not dropped) so that migration is non-destructive.
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
    /** @deprecated Superseded by `color` — see the table comment. */
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),
    color: text("color"),
    url: text("url").notNull(),
    altText: text("alt_text").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_images_product_id_idx").on(table.productId),
    index("product_images_variant_id_idx").on(table.variantId),
    index("product_images_product_color_idx").on(table.productId, table.color),
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
