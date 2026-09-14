"use server";

import { revalidatePath } from "next/cache";
import { eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { customerRoleSchema } from "@/lib/validation/admin";
import { isAdmin, FORBIDDEN_ADMIN_ONLY_ERROR, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";

/**
 * Changing a user's role is restricted to `admin` (not `staff`) — see
 * `src/domains/auth/roles.ts`'s header comment on why this action uses
 * `isAdmin` rather than `isStaffOrAdmin`: a `staff` account granting
 * itself/anyone `admin` would be a privilege-escalation hole.
 *
 * Two additional guards beyond plain role-checking:
 * - An admin cannot demote **themselves** away from `admin` — otherwise
 *   a single careless click could lock the only signed-in admin out of
 *   `/admin` entirely with no other admin session left to undo it.
 * - The **last remaining** staff/admin account in the whole system
 *   cannot be demoted to `customer` — otherwise the store could end up
 *   with zero accounts able to sign in to `/admin` at all, a worse
 *   failure mode than one admin being temporarily unable to demote
 *   themselves (rule F.1 "prefer the simplest production-safe
 *   solution": refuse rather than leave the store unmanageable).
 */
export async function updateCustomerRoleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: UNAUTHORIZED_ERROR };
  if (!isAdmin(session.user.role)) return { ok: false, error: FORBIDDEN_ADMIN_ONLY_ERROR };

  const parsed = customerRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "اطلاعات وارد شده معتبر نیست" };
  const { userId, role } = parsed.data;

  if (userId === session.user.id && role !== "admin") {
    return { ok: false, error: "شما نمی‌توانید نقش خودتان را کاهش دهید" };
  }

  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target) return { ok: false, error: "کاربر یافت نشد" };

  const wasStaffOrAdmin = target.role === "admin" || target.role === "staff";
  if (wasStaffOrAdmin && role === "customer") {
    const otherStaffOrAdmin = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.role, "admin"), eq(users.role, "staff")));
    const remainingAfterDemotion = otherStaffOrAdmin.filter((row) => row.id !== userId);
    if (remainingAfterDemotion.length === 0) {
      return { ok: false, error: "حداقل یک حساب مدیر/کارمند باید باقی بماند" };
    }
  }

  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
  await recordAuditLog(session.user, "customer.role_change", "user", userId, { newRole: role, previousRole: target.role });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${userId}`);
  return { ok: true };
}
