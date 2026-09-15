import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orderItems, orders, reviews, users } from "@/lib/db/schema";
import type { Review } from "@/lib/db/schema";

/**
 * The only sanctioned place to read `reviews` rows — same "structurally
 * ownership-scoped" shape every other domain in this codebase follows
 * since Phase 6 (`addresses/queries.ts`, `orders/queries.ts`).
 */

export type PublicReview = Pick<
  Review,
  "id" | "rating" | "title" | "body" | "isVerifiedPurchase" | "createdAt"
> & {
  authorName: string;
};

export type ProductReviewSummary = {
  reviews: PublicReview[];
  averageRating: number | null;
  approvedCount: number;
};

/** Storefront read for the product detail page — approved reviews only.
 * A `pending`/`rejected` review is never visible to anyone but its own
 * author (not even exposed here) and admins (`admin-queries.ts`). */
export async function getApprovedReviewsForProduct(productId: string): Promise<ProductReviewSummary> {
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      isVerifiedPurchase: reviews.isVerifiedPurchase,
      createdAt: reviews.createdAt,
      authorName: users.fullName,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt));

  const approvedCount = rows.length;
  const averageRating =
    approvedCount === 0 ? null : Math.round((rows.reduce((sum, row) => sum + row.rating, 0) / approvedCount) * 10) / 10;

  return {
    reviews: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title,
      body: row.body,
      isVerifiedPurchase: row.isVerifiedPurchase,
      createdAt: row.createdAt,
      // A reviewer's full name is optional at registration (Phase 6) —
      // fall back to a generic Persian label rather than showing "null"
      // or leaking their mobile number on a public page.
      authorName: row.authorName ?? "مشتری ترندز",
    })),
    averageRating,
    approvedCount,
  };
}

/** Ownership-scoped — a customer's own review regardless of its
 * moderation status, so the product page can show them "your review is
 * awaiting approval" instead of silently re-showing the submission form
 * (which would violate the one-review-per-product uniqueness constraint
 * on the next submit attempt). */
export async function getUserReviewForProduct(userId: string, productId: string): Promise<Review | null> {
  const [row] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.productId, productId)))
    .limit(1);
  return row ?? null;
}

/**
 * Real "did this customer actually buy this product" check backing the
 * `isVerifiedPurchase` flag and this store's assumption (documented in
 * `lib/db/schema/reviews.ts`) that only a purchaser may review a
 * product. Counts as "purchased" any order line whose order reached a
 * genuinely-paid status — `paid`/`processing`/`shipped`/`delivered` —
 * the same status set `customers/queries.ts`'s `totalSpentToman` already
 * treats as real revenue; `pending_payment`/`cancelled`/`refunded` do
 * not count (no completed transaction, or the money was returned).
 */
export async function hasUserPurchasedProduct(userId: string, productId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.userId, userId),
        eq(orderItems.productId, productId),
        inArray(orders.status, ["paid", "processing", "shipped", "delivered"]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

