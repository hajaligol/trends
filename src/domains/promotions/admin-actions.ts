"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { coupons } from "@/lib/db/schema";
import { couponSchema } from "@/lib/validation/admin";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";
import { isCouponCodeTaken } from "@/domains/promotions/admin-queries";

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const flat = error.flatten();
  const firstField = Object.values(flat.fieldErrors).find((messages) => messages && messages.length > 0);
  return firstField?.[0] ?? "اطلاعات وارد شده معتبر نیست";
}

export async function createCouponAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = couponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  if (await isCouponCodeTaken(parsed.data.code)) {
    return { ok: false, error: "این کد تخفیف قبلاً ثبت شده است" };
  }

  const [created] = await db.insert(coupons).values(parsed.data).returning({ id: coupons.id });
  await recordAuditLog(session.user, "coupon.create", "coupon", created?.id ?? null, { code: parsed.data.code });

  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function updateCouponAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "کد تخفیف یافت نشد" };

  const parsed = couponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  if (await isCouponCodeTaken(parsed.data.code, id)) {
    return { ok: false, error: "این کد تخفیف قبلاً ثبت شده است" };
  }

  await db
    .update(coupons)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(coupons.id, id));

  await recordAuditLog(session.user, "coupon.update", "coupon", id, parsed.data);

  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${id}`);
  return { ok: true };
}

/** A lightweight, non-form toggle for the coupons list table — flips
 * `isActive` without requiring the full edit form, mirroring how
 * `AdminOrderStatusForm` keeps quick admin actions separate from full
 * edit forms. */
export async function toggleCouponActiveAction(id: string, nextActive: boolean): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  await db.update(coupons).set({ isActive: nextActive, updatedAt: new Date() }).where(eq(coupons.id, id));
  await recordAuditLog(session.user, "coupon.toggle_active", "coupon", id, { isActive: nextActive });

  revalidatePath("/admin/coupons");
  return { ok: true };
}
