/**
 * Notification-provider adapter boundary for order/payment lifecycle
 * messages, mirroring `src/domains/payments/provider.ts`'s shape —
 * TRENDS_PROJECT_CONTEXT.md §6 "Notifications" asks for "an extensible
 * notification layer" with "email/SMS provider integrations ...
 * implemented behind adapters", and CLAUDE_BUILD_INSTRUCTIONS.txt Phase
 * 10 explicitly calls for "*an* adapter interface even if the only
 * implementation is a console-log/no-op stub for now."
 *
 * `src/domains/auth/notifications.ts` (Phase 6) already established this
 * exact pattern for password-reset links, one-off; this file generalizes
 * it into a real interface so every order-lifecycle call site
 * (`src/domains/orders/queries.ts`, `src/domains/payments/queries.ts`)
 * goes through one place rather than each hand-rolling its own
 * `console.log`.
 *
 * No SMS/email provider is configured (`SMS_PROVIDER_API_KEY` in
 * `.env.example` is blank) — per rule A.17, this never pretends to send
 * a real message. `ConsoleNotificationProvider` logs a clearly-labeled
 * line instead, so the *call sites* (order confirmed, payment
 * succeeded/failed, status changed, cancelled) are fully wired and
 * testable end-to-end; swapping in a real SMS/email adapter later means
 * adding one more branch to `getNotificationProvider()`, not touching
 * any call site.
 */

export type OrderNotificationEvent =
  | { type: "order_confirmed"; mobile: string; orderNumber: string; totalToman: number }
  | { type: "payment_succeeded"; mobile: string; orderNumber: string }
  | { type: "payment_failed"; mobile: string; orderNumber: string }
  | { type: "order_status_changed"; mobile: string; orderNumber: string; status: string }
  | { type: "order_cancelled"; mobile: string; orderNumber: string };

export interface NotificationProvider {
  readonly name: string;
  send(event: OrderNotificationEvent): Promise<void>;
}

const EVENT_LABELS: Record<OrderNotificationEvent["type"], string> = {
  order_confirmed: "تأیید سفارش",
  payment_succeeded: "پرداخت موفق",
  payment_failed: "پرداخت ناموفق",
  order_status_changed: "تغییر وضعیت سفارش",
  order_cancelled: "لغو سفارش",
};

/** The only implementation today. Never claims to be a real SMS/email
 * send (rule A.17) — logs a clearly-labeled line to the server console
 * so every notification call site is exercised and observable in
 * dev/tests without a real provider. */
class ConsoleNotificationProvider implements NotificationProvider {
  readonly name = "console";

  async send(event: OrderNotificationEvent): Promise<void> {
    const label = EVENT_LABELS[event.type];
    console.log(
      `[notifications] SMS_PROVIDER_API_KEY is not configured — this is NOT a real SMS. ` +
        `${label} → ${event.mobile} — order ${event.orderNumber}` +
        (event.type === "order_confirmed" ? ` (${event.totalToman.toLocaleString("en-US")} تومان)` : "") +
        (event.type === "order_status_changed" ? ` → ${event.status}` : ""),
    );
  }
}

export function getNotificationProvider(): NotificationProvider {
  // Structured exactly like `getPaymentProvider()` — a real adapter
  // would branch on an env var here (e.g. `NOTIFICATION_PROVIDER=sms-ir`)
  // once real credentials exist. None do yet.
  return new ConsoleNotificationProvider();
}

/** Thin convenience wrapper so call sites don't need to import
 * `getNotificationProvider()` themselves. Never throws — a notification
 * failure must not roll back or block the commerce operation that
 * triggered it (an order is still validly placed/cancelled/shipped even
 * if, say, a future real SMS provider's API call fails). */
export async function notifyOrderEvent(event: OrderNotificationEvent): Promise<void> {
  try {
    await getNotificationProvider().send(event);
  } catch (error) {
    console.error("[notifications] failed to send notification", error);
  }
}
