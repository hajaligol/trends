import { relations, sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";
import { users } from "./users";

/**
 * Customer product reviews, per TRENDS_PROJECT_CONTEXT.md §6 "Reviews"
 * ("rating", "text", "moderation status", "customer ownership checks",
 * "duplicate/review abuse controls") and CLAUDE_BUILD_INSTRUCTIONS.txt
 * Phase 12 ("product reviews with moderation", "verified purchase
 * marker").
 *
 * `status` starts at `pending` and only ever becomes `approved`/
 * `rejected` through `src/domains/reviews/admin-actions.ts`'s
 * `moderateReviewAction` — the storefront only ever reads `approved`
 * rows (`getApprovedReviewsForProduct`), mirroring how `orders.status`
 * is the single source of truth Phase 10 established for order state.
 *
 * `isVerifiedPurchase` is set once, at submission time, from a real
 * check against `order_items`/`orders` for that user/product (see
 * `src/domains/reviews/queries.ts`'s `hasUserPurchasedProduct`) — this
 * store only allows a review to be submitted at all by a customer who
 * has actually purchased the product (documented assumption, since
 * TRENDS_PROJECT_CONTEXT.md asks for "verified purchase indicator" and
 * "customer ownership checks" but doesn't specify whether
 * non-purchasers may review; requiring a purchase is the safer, more
 * standard reading and makes the field always `true` in practice today
 * — kept as its own column rather than assumed/implicit so a future
 * phase that relaxes this rule doesn't need a schema change).
 *
 * `uniqueIndex(userId, productId)` is the actual duplicate-prevention
 * mechanism (rule F.3 "never rely only on application code to enforce
 * uniqueness"), not just an application-level check before insert —
 * same shape as `wishlist_items`.
 *
 * `productId`/`userId` both cascade-delete (unlike `order_items`, which
 * deliberately keeps historical snapshots alive after a product/variant
 * is deleted) — a review has no independent meaning once either the
 * product it's about or the account that wrote it is gone, so there is
 * no snapshot to preserve here.
 */
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
    moderatedByUserId: uuid("moderated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    moderationNote: text("moderation_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reviews_user_id_product_id_idx").on(table.userId, table.productId),
    index("reviews_product_id_idx").on(table.productId),
    index("reviews_status_idx").on(table.status),
    check("reviews_rating_range", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
  ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  moderatedBy: one(users, { fields: [reviews.moderatedByUserId], references: [users.id] }),
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
