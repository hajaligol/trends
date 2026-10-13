import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";

/**
 * Product brands («برند»). Replaces the free-text `products.brand` column:
 * a product now points at one row here (`products.brand_id`), so the admin
 * picks from a managed list instead of retyping — and mistyping — names.
 *
 * - `name` is the display name shown to customers (usually Persian);
 *   `nameEn` is the optional Latin spelling, also searchable on the
 *   storefront («نایک» / «Nike» find the same products).
 * - `slug` is a stable identifier (Persian or Latin letters, like product
 *   slugs). It is unique in the database, not just in the admin action.
 * - Names are unique **case-insensitively** (`lower(name)`), so «Nike» and
 *   «nike» cannot both exist.
 * - `isActive = false` retires a brand without touching its products: they
 *   stay purchasable, but the brand is no longer offered in the product
 *   form and is no longer shown (or searchable) on the storefront.
 * - Deleting a brand that still has products is blocked by the FK
 *   (`ON DELETE RESTRICT` on `products.brand_id`); deactivate it instead.
 * - `logoUrl` is uploaded through `/api/admin/media` (folder `brands`).
 */
export const brands = pgTable(
  "brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    description: text("description"),
    logoUrl: text("logo_url"),
    /** Free text, e.g. «ایران», «ترکیه», «ایتالیا». */
    countryOfOrigin: text("country_of_origin"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("brands_slug_idx").on(table.slug),
    uniqueIndex("brands_name_lower_idx").on(sql`lower(${table.name})`),
    index("brands_is_active_display_order_idx").on(table.isActive, table.displayOrder),
  ],
);

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
