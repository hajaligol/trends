import { count, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterSubscribers } from "@/lib/db/schema";
import type { NewsletterSubscriber } from "@/lib/db/schema";

export type AdminSubscriberFilter = { page?: number; pageSize?: number };

export type AdminSubscriberPage = {
  rows: NewsletterSubscriber[];
  page: number;
  pageSize: number;
  total: number;
};

/** Admin-facing subscriber list for `/admin/newsletter`, per
 * TRENDS_PROJECT_CONTEXT.md §7's "newsletter subscribers" admin task —
 * every row, active and unsubscribed, newest first. */
export async function listSubscribersForAdmin({ page = 1, pageSize = 50 }: AdminSubscriberFilter = {}): Promise<AdminSubscriberPage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(200, Math.max(1, pageSize));

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.createdAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    // Real `COUNT(*)` (Phase 13 query-review fix) instead of selecting
    // every subscriber's id just to take `.length`.
    db.select({ total: count() }).from(newsletterSubscribers),
  ]);

  return { rows, page: safePage, pageSize: safePageSize, total: totalRows[0]?.total ?? 0 };
}
