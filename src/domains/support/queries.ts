import { and, count, desc, eq, gte, ilike, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { supportMessages, users } from "@/lib/db/schema";
import type { SupportMessage } from "@/lib/db/schema";
import { containsPattern, dateRangeBounds, mobileSearchDigits, type DateRangeParams } from "@/lib/utils/admin-filters";

export type AdminSupportMessageFilter = {
  onlyUnresolved?: boolean;
  /** Sender name / e-mail / mobile, or the linked account's name / e-mail / mobile (already normalised). */
  user?: string;
  /** Free text inside the subject or message body. */
  q?: string;
  /** Inclusive Tehran-day range on the message's creation date. */
  dateRange?: DateRangeParams;
  page?: number;
  pageSize?: number;
};

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
  user,
  q,
  dateRange,
  page = 1,
  pageSize = 20,
}: AdminSupportMessageFilter = {}): Promise<AdminSupportMessagePage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const { start, endExclusive } = dateRangeBounds(dateRange ?? {});

  // A message can come from a guest (name/e-mail/mobile typed in the form)
  // or from a signed-in customer (`user_id`); "user" matches either, so the
  // account's own name/mobile is searchable too (LEFT JOIN: guests stay).
  let userClause: SQL | undefined;
  if (user) {
    const like = containsPattern(user);
    const digits = mobileSearchDigits(user);
    const clauses: SQL[] = [
      ilike(supportMessages.name, like),
      ilike(supportMessages.email, like),
      ilike(users.fullName, like),
      ilike(users.email, like),
    ];
    if (digits) {
      clauses.push(ilike(supportMessages.mobile, containsPattern(digits)), ilike(users.mobile, containsPattern(digits)));
    }
    userClause = or(...clauses);
  }

  const where = and(
    onlyUnresolved ? eq(supportMessages.isResolved, false) : undefined,
    userClause,
    q ? or(ilike(supportMessages.subject, containsPattern(q)), ilike(supportMessages.message, containsPattern(q))) : undefined,
    start ? gte(supportMessages.createdAt, start) : undefined,
    endExclusive ? lt(supportMessages.createdAt, endExclusive) : undefined,
  );

  const [rows, totalRows] = await Promise.all([
    db
      .select({ message: supportMessages })
      .from(supportMessages)
      .leftJoin(users, eq(users.id, supportMessages.userId))
      .where(where)
      .orderBy(desc(supportMessages.createdAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    // Real `COUNT(*)` (Phase 13 query-review fix) instead of selecting
    // every matching message's id just to take `.length`.
    db.select({ total: count() }).from(supportMessages).leftJoin(users, eq(users.id, supportMessages.userId)).where(where),
  ]);

  return { rows: rows.map((row) => row.message), page: safePage, pageSize: safePageSize, total: totalRows[0]?.total ?? 0 };
}

export async function countUnresolvedSupportMessages(): Promise<number> {
  const [row] = await db.select({ total: count() }).from(supportMessages).where(eq(supportMessages.isResolved, false));
  return row?.total ?? 0;
}
