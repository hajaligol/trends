import { and, count, desc, eq, gte, ilike, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { products, reviews, users } from "@/lib/db/schema";
import type { Review } from "@/lib/db/schema";
import { userSearchCondition, productSearchCondition } from "@/domains/admin/search-conditions";
import { containsPattern, dateRangeBounds, type DateRangeParams } from "@/lib/utils/admin-filters";

export type AdminReviewRow = Review & { productTitle: string; productSlug: string; authorMobile: string; authorName: string | null };

export type AdminReviewFilter = {
  status?: Review["status"];
  /** Customer name / e-mail / mobile (already normalised). */
  user?: string;
  /** Product title / slug / product code (already normalised). */
  product?: string;
  /** Free text inside the review's title or body. */
  q?: string;
  /** Inclusive Tehran-day range on the review's creation date. */
  dateRange?: DateRangeParams;
  page?: number;
  pageSize?: number;
};

export type AdminReviewPage = {
  rows: AdminReviewRow[];
  page: number;
  pageSize: number;
  total: number;
};

/** Admin-facing review list, all statuses (unlike
 * `reviews/queries.ts`'s `getApprovedReviewsForProduct`, which is
 * approved-only) — authorization is the caller's job, same "not
 * ownership-scoped by design" split every other admin-queries module in
 * this codebase uses (`getOrderStatusHistoryForOrder`,
 * `listOrdersForAdmin`). */
export async function listReviewsForAdmin({
  status,
  user,
  product,
  q,
  dateRange,
  page = 1,
  pageSize = 20,
}: AdminReviewFilter = {}): Promise<AdminReviewPage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const { start, endExclusive } = dateRangeBounds(dateRange ?? {});
  const conditions: (SQL | undefined)[] = [
    status ? eq(reviews.status, status) : undefined,
    user ? userSearchCondition(user) : undefined,
    product ? productSearchCondition(product) : undefined,
    q ? or(ilike(reviews.title, containsPattern(q)), ilike(reviews.body, containsPattern(q))) : undefined,
    start ? gte(reviews.createdAt, start) : undefined,
    endExclusive ? lt(reviews.createdAt, endExclusive) : undefined,
  ];
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        review: reviews,
        productTitle: products.title,
        productSlug: products.slug,
        authorMobile: users.mobile,
        authorName: users.fullName,
      })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .innerJoin(users, eq(users.id, reviews.userId))
      .where(where)
      .orderBy(desc(reviews.createdAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    // Real `COUNT(*)` (Phase 13 query-review fix) instead of selecting
    // every matching review's id just to take `.length`.
    db
      .select({ total: count() })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .innerJoin(users, eq(users.id, reviews.userId))
      .where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      ...row.review,
      productTitle: row.productTitle,
      productSlug: row.productSlug,
      authorMobile: row.authorMobile,
      authorName: row.authorName,
    })),
    page: safePage,
    pageSize: safePageSize,
    total: totalRows[0]?.total ?? 0,
  };
}

export async function getReviewForAdmin(id: string): Promise<AdminReviewRow | null> {
  const [row] = await db
    .select({
      review: reviews,
      productTitle: products.title,
      productSlug: products.slug,
      authorMobile: users.mobile,
      authorName: users.fullName,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(eq(reviews.id, id))
    .limit(1);
  if (!row) return null;
  return { ...row.review, productTitle: row.productTitle, productSlug: row.productSlug, authorMobile: row.authorMobile, authorName: row.authorName };
}

/** Pending-review count for the admin dashboard summary — mirrors
 * `getAdminDashboardSummary`'s existing "orders awaiting action"/
 * "low-stock count" shape. */
export async function countPendingReviews(): Promise<number> {
  const [row] = await db.select({ total: count() }).from(reviews).where(eq(reviews.status, "pending"));
  return row?.total ?? 0;
}
