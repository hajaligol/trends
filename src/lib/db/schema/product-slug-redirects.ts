import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";

/**
 * Former public slugs of a product. When a product's slug changes (the
 * one-off move to Persian slugs, or an admin editing the slug), the old
 * URL is recorded here so `/product/<old-slug>` answers with a permanent
 * redirect to the current page instead of a 404 — links that were shared
 * or indexed keep working.
 *
 * `old_slug` is unique: a slug can only ever point at one product. A live
 * product always wins over a redirect row with the same slug (the page
 * looks the live slug up first), so a stale row can never hijack a URL.
 */
export const productSlugRedirects = pgTable(
  "product_slug_redirects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    oldSlug: text("old_slug").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_slug_redirects_old_slug_idx").on(table.oldSlug),
    index("product_slug_redirects_product_idx").on(table.productId),
  ],
);

export type ProductSlugRedirect = typeof productSlugRedirects.$inferSelect;
