import { relations } from "drizzle-orm";
import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";

/**
 * A logged-in user's saved product. Per TRENDS_PROJECT_CONTEXT.md §6
 * "Wishlist" — "authenticated persistence" + "sensible guest behavior" —
 * this table only ever exists for real accounts; there is no guest
 * wishlist table (unlike carts). A signed-out visitor's heart-toggle is a
 * local, non-persisted UI affordance (`WishlistButton`'s `isAuthenticated
 * === false` branch) rather than a fake write to storage that would
 * silently vanish — sensible guest behavior here means "don't pretend to
 * save it", not "save it somewhere flimsy".
 *
 * References a **product**, not a variant — a wishlist is "I'm
 * interested in this item", not a specific size/color commitment the way
 * a cart line is.
 *
 * `uniqueIndex(userId, productId)` is the actual duplicate-prevention
 * mechanism (rule F.3), not just an application-level check before
 * insert — `addToWishlist` uses `ON CONFLICT DO NOTHING` against it.
 */
export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("wishlist_items_user_id_product_id_idx").on(table.userId, table.productId),
    index("wishlist_items_user_id_idx").on(table.userId),
  ],
);

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type NewWishlistItem = typeof wishlistItems.$inferInsert;
