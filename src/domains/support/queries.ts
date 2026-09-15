import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { supportMessages } from "@/lib/db/schema";
import type { SupportMessage } from "@/lib/db/schema";

export type AdminSupportMessageFilter = { onlyUnresolved?: boolean; page?: number; pageSize?: number };

export type AdminSupportMessagePage = {
  rows: SupportMessage[];
  page: number;
  pageSize: number;
  total: number;
};

/** Admin-facing support/contact submission list for `/admin/support`,
 * per TRENDS_PROJECT_CONTEXT.md §6 "Support". Not ownership-scoped —
 * same "authorization is the caller's job" split every admin-queries
 * module in this codebase uses. */
export async function listSupportMessagesForAdmin({
  onlyUnresolved,
  page = 1,
  pageSize = 20,
}: AdminSupportMessageFilter = {}): Promise<AdminSupportMessagePage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const where = onlyUnresolved ? eq(supportMessages.isResolved, false) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(supportMessages)
      .where(where)
      .orderBy(desc(supportMessages.createdAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    // Real `COUNT(*)` (Phase 13 query-review fix) instead of selecting
    // every matching message's id just to take `.length`.
    db.select({ total: count() }).from(supportMessages).where(where),
  ]);

  return { rows, page: safePage, pageSize: safePageSize, total: totalRows[0]?.total ?? 0 };
}

export async function countUnresolvedSupportMessages(): Promise<number> {
  const [row] = await db.select({ total: count() }).from(supportMessages).where(eq(supportMessages.isResolved, false));
  return row?.total ?? 0;
}
