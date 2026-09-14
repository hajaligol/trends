import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, users } from "@/lib/db/schema";
import { toPublicUser, type PublicUser } from "@/lib/db/schema/users";

export type AdminCustomerListRow = PublicUser & {
  orderCount: number;
  totalSpentToman: number;
};

export type AdminCustomerListFilter = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AdminCustomerListPage = {
  rows: AdminCustomerListRow[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Paginated/searchable customer list for `/admin/customers`, per
 * TRENDS_PROJECT_CONTEXT.md §7's "customers" admin task. Search matches
 * mobile (the canonical identifier, §5) or full name/email — never
 * returns `passwordHash` (`toPublicUser`, same discipline as every other
 * user-facing read in this codebase since Phase 6).
 */
export async function listCustomersForAdmin({
  search,
  page = 1,
  pageSize = 20,
}: AdminCustomerListFilter = {}): Promise<AdminCustomerListPage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const where = search?.trim()
    ? or(
        ilike(users.mobile, `%${search.trim()}%`),
        ilike(users.fullName, `%${search.trim()}%`),
        ilike(users.email, `%${search.trim()}%`),
      )
    : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        user: users,
        orderCount: sql<number>`count(${orders.id})`,
        totalSpentToman: sql<number>`coalesce(sum(case when ${orders.status} in ('paid','processing','shipped','delivered') then ${orders.totalToman} else 0 end), 0)`,
      })
      .from(users)
      .leftJoin(orders, eq(orders.userId, users.id))
      .where(where)
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    db.select({ id: users.id }).from(users).where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      ...toPublicUser(row.user),
      orderCount: Number(row.orderCount),
      totalSpentToman: Number(row.totalSpentToman),
    })),
    page: safePage,
    pageSize: safePageSize,
    total: totalRows.length,
  };
}

export type AdminCustomerDetail = PublicUser & {
  recentOrders: { orderNumber: string; status: string; totalToman: number; createdAt: Date }[];
};

export async function getCustomerForAdmin(id: string): Promise<AdminCustomerDetail | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return null;

  const recentOrders = await db
    .select({ orderNumber: orders.orderNumber, status: orders.status, totalToman: orders.totalToman, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.userId, id))
    .orderBy(desc(orders.createdAt))
    .limit(20);

  return { ...toPublicUser(user), recentOrders };
}

export async function countStaffAndAdminUsers(): Promise<number> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.role, "admin"), eq(users.role, "staff")));
  return rows.length;
}
