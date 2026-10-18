import { and, count, desc, eq, gte, ilike, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterSubscribers } from "@/lib/db/schema";
import type { NewsletterSubscriber } from "@/lib/db/schema";
import { containsPattern, dateRangeBounds, type DateRangeParams } from "@/lib/utils/admin-filters";

export type AdminSubscriberFilter = {
  /** Part of the e-mail address (already normalised). */
  q?: string;
  status?: "active" | "inactive";
  /** Inclusive Tehran-day range on the subscription date. */
  dateRange?: DateRangeParams;
  page?: number;
  pageSize?: number;
};

function subscriberWhere({ q, status, dateRange }: Pick<AdminSubscriberFilter, "q" | "status" | "dateRange">) {
  const { start, endExclusive } = dateRangeBounds(dateRange ?? {});
  return and(
    q ? ilike(newsletterSubscribers.email, containsPattern(q)) : undefined,
    status ? eq(newsletterSubscribers.isActive, status === "active") : undefined,
    start ? gte(newsletterSubscribers.createdAt, start) : undefined,
    endExclusive ? lt(newsletterSubscribers.createdAt, endExclusive) : undefined,
  );
}

/** Active / unsubscribed counts for the status tabs, honouring the search and
 * date filters but not the status itself. */
export async function countSubscribersByStatus(filter: Pick<AdminSubscriberFilter, "q" | "dateRange"> = {}): Promise<{ active: number; inactive: number }> {
  const rows = await db
    .select({ isActive: newsletterSubscribers.isActive, total: count() })
    .from(newsletterSubscribers)
    .where(subscriberWhere(filter))
    .groupBy(newsletterSubscribers.isActive);
  const active = rows.find((row) => row.isActive)?.total ?? 0;
  const inactive = rows.find((row) => !row.isActive)?.total ?? 0;
  return { active, inactive };
}

export type AdminSubscriberPage = {
  rows: NewsletterSubscriber[];
  page: number;
  pageSize: number;
  total: number;
};

/** Admin-facing subscriber list for `/admin/newsletter`, per
 * TRENDS_PROJECT_CONTEXT.md §7's "newsletter subscribers" admin task —
 * every row, active and unsubscribed, newest first. */
export async function listSubscribersForAdmin({ q, status, dateRange, page = 1, pageSize = 50 }: AdminSubscriberFilter = {}): Promise<AdminSubscriberPage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(200, Math.max(1, pageSize));
  const where = subscriberWhere({ q, status, dateRange });

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(newsletterSubscribers)
      .where(where)
      .orderBy(desc(newsletterSubscribers.createdAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    // Real `COUNT(*)` (Phase 13 query-review fix) instead of selecting
    // every subscriber's id just to take `.length`.
    db.select({ total: count() }).from(newsletterSubscribers).where(where),
  ]);

  return { rows, page: safePage, pageSize: safePageSize, total: totalRows[0]?.total ?? 0 };
}
