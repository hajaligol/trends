import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { coupons, couponRedemptions } from "@/lib/db/schema";
import type { Coupon } from "@/lib/db/schema";

/**
 * Read-only admin views of `coupons` — separate from
 * `src/domains/promotions/queries.ts`'s `validateCoupon`, which is the
 * one place that ever *applies* a coupon at checkout (locking,
 * server-authoritative discount calculation). This file never computes
 * a discount amount or touches `coupon_redemptions` other than counting
 * rows for display.
 */

export type AdminCouponRow = Coupon & { redemptionCount: number };

export async function listCouponsForAdmin(): Promise<AdminCouponRow[]> {
  const rows = await db
    .select({
      coupon: coupons,
      redemptionCount: sql<number>`count(${couponRedemptions.id})`,
    })
    .from(coupons)
    .leftJoin(couponRedemptions, eq(couponRedemptions.couponId, coupons.id))
    .groupBy(coupons.id)
    .orderBy(desc(coupons.createdAt));
  return rows.map((row) => ({ ...row.coupon, redemptionCount: Number(row.redemptionCount) }));
}

export async function getCouponByIdForAdmin(id: string): Promise<Coupon | null> {
  const [row] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return row ?? null;
}

export async function isCouponCodeTaken(code: string, excludeId?: string): Promise<boolean> {
  const [existing] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, code));
  if (!existing) return false;
  return !excludeId || existing.id !== excludeId;
}
