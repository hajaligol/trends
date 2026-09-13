import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orderStatusHistory, orders, paymentEvents, payments, type Payment } from "@/lib/db/schema";
import { notifyOrderEvent } from "@/domains/notifications/provider";

/**
 * The only sanctioned place for application code to read/write
 * `payments`/`payment_events` and to transition `orders.status` into
 * `paid` — same "structurally hard to skip the guarantee" shape as
 * `orders/queries.ts`. Nothing outside this file ever writes `paid`
 * directly onto an order.
 */

/** Creates the `pending` payment row right after a successful
 * `provider.initiate()` call. Not wrapped in `createOrderFromCart`'s
 * transaction — initiating a payment is a separate step that happens
 * after the order already exists (an order can be retried with a new
 * payment attempt without recreating the order). */
export async function createPendingPayment(
  orderId: string,
  provider: string,
  amountToman: number,
  providerRef: string,
): Promise<Payment> {
  const [payment] = await db
    .insert(payments)
    .values({ orderId, provider, amountToman, providerRef, status: "pending" })
    .returning();
  if (!payment) throw new Error("Payment insert returned no row");
  await db.insert(paymentEvents).values({ paymentId: payment.id, type: "initiated" });
  return payment;
}

export async function getLatestPaymentForOrder(orderId: string): Promise<Payment | null> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment ?? null;
}

export type FinalizeVerificationOutcome =
  | { status: "not_found" }
  | { status: "already_processed"; orderNumber: string; orderStatus: string }
  | { status: "succeeded"; orderNumber: string }
  | { status: "failed"; orderNumber: string };

/**
 * The one function that turns a gateway's verification answer into a
 * durable state change. Callable exactly once-effectively per payment
 * attempt no matter how many times the gateway (or a user
 * double-clicking "return to store") invokes the callback route:
 *
 * 1. Locks the `payments` row for `(provider, providerRef)` with
 *    `FOR UPDATE` for the duration of the transaction — a second,
 *    genuinely concurrent callback for the same reference blocks until
 *    the first finishes, then sees the already-updated `status` and
 *    takes the `already_processed` branch below instead of racing it.
 * 2. Records a `callback_received` event unconditionally (audit trail —
 *    §5 "reconciliation-friendly records" — even for a call that turns
 *    out to be a duplicate).
 * 3. If the payment isn't `pending` anymore, records `duplicate_ignored`
 *    and returns `already_processed` — no further writes, so a
 *    duplicate callback can never double-apply (§9 acceptance:
 *    "Duplicate callbacks do not duplicate orders/payment effects").
 * 4. Only if still `pending`: writes `succeeded`/`failed` onto the
 *    payment, and — only on `succeeded` — flips the order from
 *    `pending_payment` to `paid` in the same transaction, recording that
 *    transition in `order_status_history` (actor `system` — Phase 10 —
 *    this is the one order-status change no human triggers directly).
 *    The order update's own `WHERE status = 'pending_payment'` guard is
 *    a second, independent layer of the same idempotency property in
 *    case a payment row were ever (incorrectly) reused across two
 *    orders.
 * 5. A `payment_succeeded`/`payment_failed` notification (Phase 10, see
 *    `src/domains/notifications/provider.ts`) is sent once the
 *    transaction has committed — never from inside it, and never for
 *    the `already_processed`/`not_found` branches, since those made no
 *    real state change worth notifying about.
 *
 * `verified` must already be the result of calling the provider's
 * `verify()` — this function never re-derives it from a raw query
 * string itself (§5 "never trust the browser return page as proof of
 * payment").
 */
export async function finalizePaymentVerification(
  provider: string,
  providerRef: string,
  verified: boolean,
  payload: Record<string, unknown>,
): Promise<FinalizeVerificationOutcome> {
  const outcome = await db.transaction(async (tx): Promise<FinalizeVerificationOutcome & { mobile?: string }> => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.provider, provider), eq(payments.providerRef, providerRef)))
      .for("update")
      .limit(1);

    if (!payment) return { status: "not_found" };

    await tx.insert(paymentEvents).values({ paymentId: payment.id, type: "callback_received", payload });

    const [order] = await tx.select().from(orders).where(eq(orders.id, payment.orderId)).limit(1);
    if (!order) return { status: "not_found" };

    if (payment.status !== "pending") {
      await tx.insert(paymentEvents).values({ paymentId: payment.id, type: "duplicate_ignored", payload });
      return { status: "already_processed", orderNumber: order.orderNumber, orderStatus: order.status };
    }

    if (verified) {
      await tx
        .update(payments)
        .set({ status: "succeeded", verifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
      const [updatedOrder] = await tx
        .update(orders)
        .set({ status: "paid", updatedAt: new Date() })
        .where(and(eq(orders.id, order.id), eq(orders.status, "pending_payment")))
        .returning();
      if (updatedOrder) {
        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          fromStatus: "pending_payment",
          toStatus: "paid",
          actorRole: "system",
          note: `${provider} providerRef=${providerRef}`,
        });
      }
      await tx.insert(paymentEvents).values({ paymentId: payment.id, type: "verified_succeeded", payload });
      return { status: "succeeded", orderNumber: order.orderNumber, mobile: order.recipientMobile };
    }

    await tx.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.id, payment.id));
    await tx.insert(paymentEvents).values({ paymentId: payment.id, type: "verified_failed", payload });
    return { status: "failed", orderNumber: order.orderNumber, mobile: order.recipientMobile };
  });

  if (outcome.status === "succeeded" && outcome.mobile) {
    await notifyOrderEvent({ type: "payment_succeeded", mobile: outcome.mobile, orderNumber: outcome.orderNumber });
  } else if (outcome.status === "failed" && outcome.mobile) {
    await notifyOrderEvent({ type: "payment_failed", mobile: outcome.mobile, orderNumber: outcome.orderNumber });
  }

  const { mobile: _mobile, ...publicOutcome } = outcome;
  return publicOutcome;
}
