import type { Order } from "@/lib/db/schema";

/**
 * The single source of truth for which `orders.status` transitions are
 * legal and who may perform them — TRENDS_PROJECT_CONTEXT.md §6 ("order
 * lifecycle should be explicit and validated, not arbitrary strings")
 * and CLAUDE_BUILD_INSTRUCTIONS.txt Phase 10 ("Order state transitions
 * are validated"). Every caller (`cancelOrderForUser`,
 * `adminTransitionOrderStatus` in `src/domains/orders/queries.ts`) checks
 * against this table rather than trusting whatever status string a form
 * submitted — the actual current status is always re-read from the
 * database inside a transaction first (see those functions), never
 * taken from the client.
 */

export type OrderStatus = Order["status"];

/** Statuses a *customer* may cancel their own order from. Once an order
 * has shipped, cancellation is no longer self-service — TRENDS_PROJECT_CONTEXT.md
 * doesn't specify a returns/refund flow for shipped goods (Phase 12
 * "return/refund architecture" is the follow-up for that), so this phase
 * intentionally stops self-service cancellation at `processing`. */
const CUSTOMER_CANCELLABLE_STATUSES: readonly OrderStatus[] = ["pending_payment", "paid", "processing"];

export function canCustomerCancel(status: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.includes(status);
}

/**
 * Admin/staff-only transition table. `paid` is deliberately absent as a
 * *target* here — the only sanctioned way an order becomes `paid` is a
 * verified payment callback (`finalizePaymentVerification`), never an
 * admin form, so a compromised or careless admin UI can't mark an unpaid
 * order paid. `cancelled -> refunded` is the one admin action that
 * follows a customer/admin cancellation of an already-paid order —
 * TRENDS_PROJECT_CONTEXT.md §5/§9 forbid fabricating a real gateway
 * refund API call (rule A.17), so `refunded` here only records that an
 * operator has manually reconciled the refund outside this system; it
 * does not itself call any payment provider.
 */
const ADMIN_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: ["refunded"],
  refunded: [],
};

export function getAdminAllowedNextStatuses(status: OrderStatus): readonly OrderStatus[] {
  return ADMIN_TRANSITIONS[status] ?? [];
}

export function canAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_TRANSITIONS[from]?.includes(to) ?? false;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال‌شده",
  delivered: "تحویل داده‌شده",
  cancelled: "لغو‌شده",
  refunded: "بازپرداخت‌شده",
};
