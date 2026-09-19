import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
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
 * Storefront categories. Self-referencing `parentId` (an adjacency list)
 * models the three-level tree — audience (مردانه/زنانه/بچگانه) > group
 * (لباس مردانه/کفش مردانه/...) > type (پیراهن مردانه/...) — without a
 * separate table, per TRENDS_PROJECT_CONTEXT.md §12 ("use the simplest
 * schema that fully represents the requirements"). The canonical tree
 * lives in `src/domains/categories/taxonomy.ts`; products attach to the
 * type (leaf) level only, and the 3-level limit and cycle-freedom are
 * enforced by `validateCategoryParent` in the admin actions.
 *
 * `imageUrl` was added by migration `0008` alongside the admin media
 * upload endpoint (`src/app/api/admin/media/route.ts`). Nullable; the
 * category circle on the homepage falls back to `AssetSlot` when null.
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_slug_idx").on(table.slug),
    // Child lookups (menu/tree building, "has children?" delete guard).
    index("categories_parent_id_idx").on(table.parentId),
    // A category can never be its own parent — the cheapest cycle there is,
    // enforced by the database and not just the admin action.
    check("categories_no_self_parent_check", sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`),
  ],
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, { relationName: "category_parent" }),
  products: many(products),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
