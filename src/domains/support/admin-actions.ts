"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { supportMessages } from "@/lib/db/schema";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";

/** Marks a support submission resolved/unresolved — same toggle shape as
 * `toggleCouponActiveAction`/`toggleSubscriberActiveAction`. */
export async function toggleSupportMessageResolvedAction(id: string, isResolved: boolean): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  await db
    .update(supportMessages)
    .set({
      isResolved,
      resolvedByUserId: isResolved ? session.user.id : null,
      resolvedAt: isResolved ? new Date() : null,
    })
    .where(eq(supportMessages.id, id));

  await recordAuditLog(session.user, isResolved ? "support_message.resolve" : "support_message.reopen", "support_message", id);

  revalidatePath("/admin/support");
  return { ok: true };
}
