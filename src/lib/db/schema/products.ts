import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { productImages } from "./product-images";
import { productVariants } from "./product-variants";

/**
 * Source of the human-friendly product code («کد کالا»). A database
 * sequence (not `max()+1` in app code) so concurrent product creation can
 * never hand out the same code; gaps after a rolled-back insert are
 * harmless. Starts at 100001 so every code has six digits.
 */
export const productCodeSeq = pgSequence("product_code_seq", { startWith: 100001, increment: 1 });

/**
 * A sellable clothing product. Price/stock live on `product_variants`
 * (size/color combinations), never here — a "پیراهن کلاسیک" isn't
 * purchasable on its own until a size/color variant is chosen, and
 * TRENDS_PROJECT_CONTEXT.md §6 "Product model" is explicit that variants
 * should represent real stock, not one universal number on the product.
 *
 * `tags` is a plain Postgres text array rather than a tags/product_tags
 * join-table pair. A join table would allow tag reuse/renaming and
 * relational tag pages, but nothing in Phase 3-5's scope (search/filter,
 * SEO, catalog browsing) actually needs that yet; a text[] is the simplest
 * schema that represents "a product has some free-text tags" today, per
 * rule F.5 ("prefer maintainability over cleverness") and F.6 ("prefer
 * fewer dependencies"/simpler structures). Documented here so a future
 * phase that needs tag reuse/analytics knows this was a deliberate
 * simplification, not an oversight.
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Unique, auto-assigned «کد کالا». Never edited by hand; variant SKUs
     * are derived from it. Searchable in the admin and on the storefront. */
    productCode: integer("product_code")
      .notNull()
      .default(sql`nextval('product_code_seq')`),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    shortDescription: text("short_description"),
    longDescription: text("long_description"),
    brand: text("brand"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    tags: text("tags").array().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNewArrival: boolean("is_new_arrival").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("products_slug_idx").on(table.slug),
    uniqueIndex("products_product_code_idx").on(table.productCode),
    index("products_category_id_idx").on(table.categoryId),
    index("products_is_active_idx").on(table.isActive),
    index("products_is_featured_idx").on(table.isFeatured),
    index("products_is_new_arrival_idx").on(table.isNewArrival),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
  images: many(productImages),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
