import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, productVariants, users } from "@/lib/db/schema";
import { countPendingReviews } from "@/domains/reviews/admin-queries";
import { countUnresolvedSupportMessages } from "@/domains/support/queries";

/**
 * A single aggregate read for `/admin` (the dashboard landing page) —
 * counts/sums only, no row-level data, so this is safe to compute with a
 * handful of small queries rather than needing its own materialized
 * view at this catalog's current scale. Phase 12 added
 * `pendingReviewCount`/`unresolvedSupportMessageCount`, the same
 * "awaiting action" signal `ordersAwaitingAction` already established,
 * extended to the two new moderation/triage queues this phase adds.
 */
export type AdminDashboardSummary = {
  ordersAwaitingAction: number;
  revenueThisMonthToman: number;
  totalCustomers: number;
  lowStockVariantCount: number;
  pendingReviewCount: number;
  unresolvedSupportMessageCount: number;
  recentOrders: { orderNumber: string; status: string; totalToman: number; createdAt: Date }[];
};

// Orders the *operator* has to act on (pack / ship). `pending_payment` is
// deliberately excluded: that is waiting on the customer, not on staff.
// The sidebar badge (`getAdminNavBadges`) uses the same definition.
const ACTION_NEEDED_STATUSES = ["paid", "processing"] as const;
const REVENUE_COUNTED_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Real `COUNT(*)` aggregates (Phase 13 query-review fix) instead of
  // selecting every matching row's id just to take `.length` — this
  // dashboard page is read on every `/admin` visit, so it's the single
  // highest-traffic place this anti-pattern existed.
  const [awaitingRows, revenueRows, customerRows, lowStockRows, recentOrders, pendingReviewCount, unresolvedSupportMessageCount] =
    await Promise.all([
      db.select({ total: count() }).from(orders).where(inArray(orders.status, [...ACTION_NEEDED_STATUSES])),
      db
        .select({ total: sql<number>`coalesce(sum(${orders.totalToman}), 0)` })
        .from(orders)
        .where(and(gte(orders.createdAt, startOfMonth), inArray(orders.status, [...REVENUE_COUNTED_STATUSES]))),
      db.select({ total: count() }).from(users).where(eq(users.role, "customer")),
      db
        .select({ total: count() })
        .from(productVariants)
        .where(and(eq(productVariants.isActive, true), sql`${productVariants.stock} <= ${productVariants.lowStockThreshold}`)),
      db
        .select({ orderNumber: orders.orderNumber, status: orders.status, totalToman: orders.totalToman, createdAt: orders.createdAt })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(8),
      countPendingReviews(),
      countUnresolvedSupportMessages(),
    ]);

  return {
    ordersAwaitingAction: awaitingRows[0]?.total ?? 0,
    revenueThisMonthToman: Number(revenueRows[0]?.total ?? 0),
    totalCustomers: customerRows[0]?.total ?? 0,
    lowStockVariantCount: lowStockRows[0]?.total ?? 0,
    pendingReviewCount,
    unresolvedSupportMessageCount,
    recentOrders,
  };
}

/**
 * The handful of "needs attention" counts shown as badges on the admin
 * sidebar. Four cheap `COUNT(*)` reads, run by the admin layout on every
 * admin page view — kept separate from `getAdminDashboardSummary` so the
 * shell never pays for the dashboard's revenue/recent-orders queries.
 */
export type AdminNavBadges = {
  orders: number;
  inventory: number;
  reviews: number;
  support: number;
};

export async function getAdminNavBadges(): Promise<AdminNavBadges> {
  const [awaitingRows, lowStockRows, reviews, support] = await Promise.all([
    db.select({ total: count() }).from(orders).where(inArray(orders.status, ["paid", "processing"])),
    db
      .select({ total: count() })
      .from(productVariants)
      .where(and(eq(productVariants.isActive, true), sql`${productVariants.stock} <= ${productVariants.lowStockThreshold}`)),
    countPendingReviews(),
    countUnresolvedSupportMessages(),
  ]);
  return {
    orders: awaitingRows[0]?.total ?? 0,
    inventory: lowStockRows[0]?.total ?? 0,
    reviews,
    support,
  };
}
