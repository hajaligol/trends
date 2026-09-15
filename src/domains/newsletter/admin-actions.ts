"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { newsletterSubscribers } from "@/lib/db/schema";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";

/** Admin-only unsubscribe/re-subscribe toggle — same shape as
 * `toggleCouponActiveAction` (Phase 11). The only way to flip a
 * subscriber's `isActive` flag this phase, since there is no real
 * outbound email to carry a self-service unsubscribe link yet (see
 * `notifications/provider.ts`'s header comment). */
export async function toggleSubscriberActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  await db
    .update(newsletterSubscribers)
    .set({ isActive, unsubscribedAt: isActive ? null : new Date() })
    .where(eq(newsletterSubscribers.id, id));

  await recordAuditLog(session.user, isActive ? "newsletter_subscriber.reactivate" : "newsletter_subscriber.unsubscribe", "newsletter_subscriber", id);

  revalidatePath("/admin/newsletter");
  return { ok: true };
}
