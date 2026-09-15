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
 *
 * Phase 12 generalized the event union from order/payment-only
 * (`OrderNotificationEvent`) to `NotificationEvent`, adding
 * `review_approved`/`review_rejected` (sent to the reviewing customer,
 * mirroring `order_status_changed`'s shape) and
 * `support_message_received` (store-facing — a new submission on
 * `/contact`, not addressed to any customer `mobile`, so it carries a
 * `recipient: "store"` discriminant instead) — per this phase's own
 * handoff instruction: "extend the existing stub ... if it fits the
 * existing interface cleanly; don't invent a second notification
 * system." The exported function name (`notifyEvent`, renamed from the
 * original `notifyOrderEvent` since it's no longer order-only) and every
 * call site were updated together in this phase; the interface/provider
 * shape itself did not change.
 */

export type NotificationEvent =
  | { type: "order_confirmed"; mobile: string; orderNumber: string; totalToman: number }
  | { type: "payment_succeeded"; mobile: string; orderNumber: string }
  | { type: "payment_failed"; mobile: string; orderNumber: string }
  | { type: "order_status_changed"; mobile: string; orderNumber: string; status: string }
  | { type: "order_cancelled"; mobile: string; orderNumber: string }
  | { type: "review_approved"; mobile: string; productTitle: string }
  | { type: "review_rejected"; mobile: string; productTitle: string; note: string | null }
  | { type: "support_message_received"; recipient: "store"; subject: string; fromEmail: string };

export interface NotificationProvider {
  readonly name: string;
  send(event: NotificationEvent): Promise<void>;
}

const EVENT_LABELS: Record<NotificationEvent["type"], string> = {
  order_confirmed: "تأیید سفارش",
  payment_succeeded: "پرداخت موفق",
  payment_failed: "پرداخت ناموفق",
  order_status_changed: "تغییر وضعیت سفارش",
  order_cancelled: "لغو سفارش",
  review_approved: "تأیید دیدگاه",
  review_rejected: "رد دیدگاه",
  support_message_received: "پیام پشتیبانی جدید",
};

/** The only implementation today. Never claims to be a real SMS/email
 * send (rule A.17) — logs a clearly-labeled line to the server console
 * so every notification call site is exercised and observable in
 * dev/tests without a real provider. */
class ConsoleNotificationProvider implements NotificationProvider {
  readonly name = "console";

  async send(event: NotificationEvent): Promise<void> {
    const label = EVENT_LABELS[event.type];

    if (event.type === "support_message_received") {
      console.log(
        `[notifications] SMS_PROVIDER_API_KEY is not configured — this is NOT a real email/SMS. ` +
          `${label} → store operator — from ${event.fromEmail} — subject: ${event.subject}`,
      );
      return;
    }

    if (event.type === "review_approved" || event.type === "review_rejected") {
      console.log(
        `[notifications] SMS_PROVIDER_API_KEY is not configured — this is NOT a real SMS. ` +
          `${label} → ${event.mobile} — «${event.productTitle}»` +
          (event.type === "review_rejected" && event.note ? ` — ${event.note}` : ""),
      );
      return;
    }

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
 * failure must not roll back or block the commerce/moderation/support
 * operation that triggered it (an order is still validly placed/
 * cancelled/shipped, and a review is still validly moderated, even if,
 * say, a future real SMS provider's API call fails). Renamed from
 * `notifyEvent` this phase since the event union is no longer
 * order-only — see this file's header comment. */
export async function notifyEvent(event: NotificationEvent): Promise<void> {
  try {
    await getNotificationProvider().send(event);
  } catch (error) {
    console.error("[notifications] failed to send notification", error);
  }
}
