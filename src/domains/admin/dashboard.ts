import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
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

const ACTION_NEEDED_STATUSES = ["pending_payment", "paid", "processing"] as const;
const REVENUE_COUNTED_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [awaitingRows, revenueRows, customerRows, lowStockRows, recentOrders, pendingReviewCount, unresolvedSupportMessageCount] =
    await Promise.all([
      db.select({ id: orders.id }).from(orders).where(inArray(orders.status, [...ACTION_NEEDED_STATUSES])),
      db
        .select({ total: sql<number>`coalesce(sum(${orders.totalToman}), 0)` })
        .from(orders)
        .where(and(gte(orders.createdAt, startOfMonth), inArray(orders.status, [...REVENUE_COUNTED_STATUSES]))),
      db.select({ id: users.id }).from(users).where(eq(users.role, "customer")),
      db
        .select({ id: productVariants.id })
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
    ordersAwaitingAction: awaitingRows.length,
    revenueThisMonthToman: Number(revenueRows[0]?.total ?? 0),
    totalCustomers: customerRows.length,
    lowStockVariantCount: lowStockRows.length,
    pendingReviewCount,
    unresolvedSupportMessageCount,
    recentOrders,
  };
}
