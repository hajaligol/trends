import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, orders, payments, paymentEvents, users, carts, cartItems, products } from "@/lib/db/schema";
import { createOrderFromCart } from "@/domains/orders/queries";
import { createCart, addItemToCart } from "@/domains/cart/queries";
import { createPendingPayment, finalizePaymentVerification } from "@/domains/payments/queries";
import { createTestCategory, createTestProductWithVariant, createTestUser } from "./helpers";
import type { ShippingMethod } from "@/domains/shipping/methods";

/**
 * Critical flow #6 ("duplicate payment callback") from
 * CLAUDE_BUILD_INSTRUCTIONS.txt Phase 14 —
 * `finalizePaymentVerification`'s header comment documents this exact
 * guarantee; this test exercises it against a real order/payment rather
 * than trusting the comment.
 */

const shippingMethod: ShippingMethod = {
  code: "standard",
  label: "ارسال استاندارد",
  estimateLabel: "۳ تا ۵ روز کاری",
  feeToman: 0,
};

const shipping = {
  recipientName: "کاربر آزمایشی",
  recipientMobile: "+989123456789",
  province: "تهران",
  city: "تهران",
  addressLine: "خیابان آزمایشی، پلاک ۱",
  postalCode: "1234567890",
  plaqueUnitDetails: null,
  deliveryNotes: null,
};

const createdCategoryIds: string[] = [];
const createdProductIds: string[] = [];
const createdUserIds: string[] = [];
const createdCartIds: string[] = [];
const createdOrderIds: string[] = [];

afterAll(async () => {
  for (const orderId of createdOrderIds) {
    const orderPayments = await db.select({ id: payments.id }).from(payments).where(eq(payments.orderId, orderId));
    for (const p of orderPayments) await db.delete(paymentEvents).where(eq(paymentEvents.paymentId, p.id));
    await db.delete(payments).where(eq(payments.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  }
  for (const cartId of createdCartIds) await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  for (const cartId of createdCartIds) await db.delete(carts).where(eq(carts.id, cartId));
  for (const userId of createdUserIds) await db.delete(users).where(eq(users.id, userId));
  for (const productId of createdProductIds) await db.delete(products).where(eq(products.id, productId));
  for (const categoryId of createdCategoryIds) await db.delete(categories).where(eq(categories.id, categoryId));
});

async function setUpPendingOrderWithPayment() {
  const category = await createTestCategory();
  createdCategoryIds.push(category.id);
  const { product, variant } = await createTestProductWithVariant(category.id, { stock: 5, priceToman: 300_000 });
  createdProductIds.push(product.id);

  const user = await createTestUser();
  createdUserIds.push(user.id);
  const cart = await createCart(user.id);
  createdCartIds.push(cart.id);
  await addItemToCart(cart.id, variant.id, 1);

  const order = await createOrderFromCart(cart.id, user.id, shipping, shippingMethod, null);
  createdOrderIds.push(order.id);

  const providerRef = `mock-ref-${order.id}`;
  const payment = await createPendingPayment(order.id, "mock", order.totalToman, providerRef);

  return { order, payment, providerRef };
}

describe("finalizePaymentVerification — duplicate callback idempotency (critical flow #6)", () => {
  it("marks the order paid on the first verified callback", async () => {
    const { order, providerRef } = await setUpPendingOrderWithPayment();

    const outcome = await finalizePaymentVerification("mock", providerRef, true, { simulated: true });
    expect(outcome.status).toBe("succeeded");

    const [orderAfter] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    expect(orderAfter?.status).toBe("paid");
  });

  it("does not re-apply or change anything on a duplicate successful callback for the same reference", async () => {
    const { order, providerRef } = await setUpPendingOrderWithPayment();

    const first = await finalizePaymentVerification("mock", providerRef, true, { attempt: 1 });
    expect(first.status).toBe("succeeded");

    const second = await finalizePaymentVerification("mock", providerRef, true, { attempt: 2 });
    expect(second.status).toBe("already_processed");

    const third = await finalizePaymentVerification("mock", providerRef, false, { attempt: 3 });
    expect(third.status).toBe("already_processed");

    const [orderAfter] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    expect(orderAfter?.status).toBe("paid");

    const [paymentAfter] = await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
    expect(paymentAfter?.status).toBe("succeeded");

    // Exactly one `verified_succeeded` event, regardless of how many
    // duplicate callbacks arrived — the audit trail reflects one real
    // state change plus the duplicate attempts, not one event per call.
    const events = await db.select().from(paymentEvents).where(eq(paymentEvents.paymentId, paymentAfter!.id));
    const succeededEvents = events.filter((e) => e.type === "verified_succeeded");
    const duplicateEvents = events.filter((e) => e.type === "duplicate_ignored");
    expect(succeededEvents).toHaveLength(1);
    expect(duplicateEvents).toHaveLength(2);
  });

  it("marks the order's payment failed (not paid) on a failed verification, and a later duplicate stays failed", async () => {
    const { order, providerRef } = await setUpPendingOrderWithPayment();

    const first = await finalizePaymentVerification("mock", providerRef, false, { attempt: 1 });
    expect(first.status).toBe("failed");

    const [orderAfter] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    expect(orderAfter?.status).toBe("pending_payment");

    // A late "actually it succeeded" callback for an already-failed
    // payment must not flip the order to paid after the fact.
    const second = await finalizePaymentVerification("mock", providerRef, true, { attempt: 2 });
    expect(second.status).toBe("already_processed");

    const [orderAfterSecond] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    expect(orderAfterSecond?.status).toBe("pending_payment");
  });

  it("returns not_found for a reference that doesn't correspond to any payment", async () => {
    const outcome = await finalizePaymentVerification("mock", "nonexistent-ref-xyz", true, {});
    expect(outcome.status).toBe("not_found");
  });

  it("handles two genuinely concurrent callbacks for the same reference without double-applying", async () => {
    const { order, providerRef } = await setUpPendingOrderWithPayment();

    const results = await Promise.allSettled([
      finalizePaymentVerification("mock", providerRef, true, { race: "a" }),
      finalizePaymentVerification("mock", providerRef, true, { race: "b" }),
    ]);

    const statuses = results.map((r) => (r.status === "fulfilled" ? r.value.status : "threw"));
    // One serializes to `succeeded`, the other (having waited on the row
    // lock) sees the already-updated row and reports `already_processed`.
    expect(statuses.sort()).toEqual(["already_processed", "succeeded"]);

    const [orderAfter] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    expect(orderAfter?.status).toBe("paid");
  });
});
