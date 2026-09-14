"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import {
  adminTransitionOrderStatus,
  InvalidOrderTransitionError,
  OrderNotFoundError,
} from "@/domains/orders/queries";
import type { OrderStatus } from "@/domains/orders/lifecycle";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";

/**
 * The one Server Action that lets an admin/staff user move an order
 * through its fulfillment lifecycle. Authorization happens here, not
 * just by the `/admin` route tree being unlinked from customer-facing
 * navigation — CLAUDE_BUILD_INSTRUCTIONS.txt §7 "Admin must not rely on
 * hidden UI alone for authorization" and Phase 10's handoff instructions
 * both call this out explicitly. `role` (added to `users` in Phase 6,
 * unused until now) is read from the signed session, never from a form
 * field.
 *
 * Scope note: this is deliberately the *only* admin mutation this phase
 * adds. A full admin area (products/customers/coupons/etc. CRUD, a real
 * dashboard, an audit log UI) is Phase 11's job
 * (CLAUDE_BUILD_INSTRUCTIONS.txt Phase 11 "Admin/operations") — this
 * action and its two minimal pages (`/admin/orders`,
 * `/admin/orders/[orderNumber]`) exist only so Phase 10's own acceptance
 * criterion ("Admin can operate an order safely") is genuinely met, and
 * are meant to be absorbed into Phase 11's admin area rather than
 * duplicated by it.
 */

export type AdminTransitionResult = { ok: true } | { ok: false; error: string };

export async function adminTransitionOrderStatusAction(
  orderNumber: string,
  toStatus: OrderStatus,
  trackingNumber: string,
  note: string,
): Promise<AdminTransitionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) {
    return { ok: false, error: UNAUTHORIZED_ERROR };
  }

  try {
    await adminTransitionOrderStatus(orderNumber, session.user.id, toStatus, {
      trackingNumber: trackingNumber.trim() || null,
      note: note.trim() || null,
    });
  } catch (error) {
    if (error instanceof OrderNotFoundError || error instanceof InvalidOrderTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  await recordAuditLog(session.user, "order.status_transition", "order", orderNumber, {
    toStatus,
    trackingNumber: trackingNumber.trim() || null,
  });

  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/order/${orderNumber}`);
  return { ok: true };
}
