"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { getAddressForUser } from "@/domains/addresses/queries";
import { getCurrentCartIdReadOnly } from "@/domains/cart/resolve";
import { getCartSummary } from "@/domains/cart/queries";
import { getShippingMethod } from "@/domains/shipping/methods";
import {
  cancelOrderForUser,
  createOrderFromCart,
  EmptyCartError,
  getOrderForUser,
  InsufficientStockError,
  InvalidOrderTransitionError,
  OrderNotFoundError,
  type ShippingSnapshotInput,
} from "@/domains/orders/queries";
import { CouponInvalidError } from "@/domains/promotions/queries";
import { getPaymentProvider } from "@/domains/payments/provider";
import { createPendingPayment } from "@/domains/payments/queries";

/**
 * `placeOrderAction` is the one place checkout's "cannot manipulate
 * totals from the browser" / "cannot checkout unavailable inventory"
 * guarantees (TRENDS_PROJECT_CONTEXT.md §8) actually live. The client
 * only ever sends an `addressId` and a `shippingMethodCode` — two
 * identifiers, not a single price or line total. Every money value in
 * the resulting order is computed here, server-side, from the
 * authenticated user's real cart and a real address row they own.
 */

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; paymentNote: string; redirectUrl: string | null }
  | { ok: false; error: string };

export async function placeOrderAction(
  addressId: string,
  shippingMethodCode: string,
  customerNote: string,
  // `null`/empty when no coupon was applied — see `createOrderFromCart`'s
  // header comment for why this is re-validated authoritatively here
  // rather than trusting whatever `previewCouponAction` returned earlier.
  couponCode: string | null = null,
): Promise<PlaceOrderResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "برای ثبت سفارش ابتدا وارد حساب کاربری خود شوید" };
  }

  // Ownership-scoped lookup (never a bare `getAddressById`) — see
  // `addresses/queries.ts`'s header comment. A client-submitted
  // `addressId` for someone else's address simply resolves to `null`.
  const address = await getAddressForUser(addressId, session.user.id);
  if (!address) {
    return { ok: false, error: "آدرس انتخاب‌شده معتبر نیست" };
  }

  const cartId = await getCurrentCartIdReadOnly();
  const cart = await getCartSummary(cartId);
  if (cart.items.length === 0) {
    return { ok: false, error: "سبد خرید شما خالی است" };
  }
  if (cart.items.some((item) => !item.isAvailable || item.isQuantityReduced)) {
    return {
      ok: false,
      error: "برخی کالاهای سبد خرید شما دیگر موجود نیستند یا موجودی کافی ندارند. لطفاً سبد خرید را بررسی کنید.",
    };
  }

  const shippingMethod = getShippingMethod(shippingMethodCode, cart.subtotalToman);
  if (!shippingMethod) {
    return { ok: false, error: "روش ارسال انتخاب‌شده معتبر نیست" };
  }

  const shippingSnapshot: ShippingSnapshotInput = {
    recipientName: address.recipientName,
    recipientMobile: address.recipientMobile,
    province: address.province,
    city: address.city,
    addressLine: address.addressLine,
    postalCode: address.postalCode,
    plaqueUnitDetails: address.plaqueUnitDetails,
    deliveryNotes: address.deliveryNotes,
  };

  const trimmedNote = customerNote.trim().slice(0, 500) || null;

  const trimmedCoupon = couponCode?.trim() || null;

  let order;
  try {
    order = await createOrderFromCart(
      cartId!,
      session.user.id,
      shippingSnapshot,
      shippingMethod,
      trimmedNote,
      trimmedCoupon,
    );
  } catch (error) {
    if (error instanceof InsufficientStockError || error instanceof EmptyCartError || error instanceof CouponInvalidError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const paymentResult = await initiatePaymentForOrder(order.id, order.orderNumber, order.totalToman);

  return {
    ok: true,
    orderNumber: order.orderNumber,
    paymentNote: paymentResult.ok ? "در حال انتقال به درگاه پرداخت..." : paymentResult.reason,
    redirectUrl: paymentResult.ok ? paymentResult.redirectUrl : null,
  };
}

/**
 * Wraps `getPaymentProvider().initiate()` with persisting the resulting
 * `payments` row — a real gateway response and a database write must
 * happen together, or a customer could be sent to pay for a reference
 * this app never recorded and could never later verify a callback
 * against. If `initiate()` reports "not configured" (§8/A.17's stub),
 * no `payments` row is created at all — there is nothing to track.
 */
async function initiatePaymentForOrder(orderId: string, orderNumber: string, totalToman: number) {
  const result = await getPaymentProvider().initiate({ id: orderId, orderNumber, totalToman });
  if (result.ok) {
    await createPendingPayment(orderId, getPaymentProvider().name, totalToman, result.providerRef);
  }
  return result;
}

/**
 * Lets a customer re-attempt payment for their own order that's still
 * `pending_payment` — e.g. they closed the mock gateway tab without
 * choosing success/failure, or a real gateway session expired. Ownership
 * is enforced the same way as everywhere else (`getOrderForUser`, no
 * bare `getOrderById`). A second `payments` row is created for the new
 * attempt; the first attempt's row (if any) is untouched history.
 */
export type RetryPaymentResult =
  | { ok: true; redirectUrl: string | null; paymentNote: string }
  | { ok: false; error: string };

export async function retryPaymentAction(orderNumber: string): Promise<RetryPaymentResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "برای پرداخت ابتدا وارد حساب کاربری خود شوید" };
  }

  const order = await getOrderForUser(orderNumber, session.user.id);
  if (!order) {
    return { ok: false, error: "سفارش یافت نشد" };
  }
  if (order.status !== "pending_payment") {
    return { ok: false, error: "این سفارش دیگر در انتظار پرداخت نیست" };
  }

  const paymentResult = await initiatePaymentForOrder(order.id, order.orderNumber, order.totalToman);
  return {
    ok: true,
    redirectUrl: paymentResult.ok ? paymentResult.redirectUrl : null,
    paymentNote: paymentResult.ok ? "در حال انتقال به درگاه پرداخت..." : paymentResult.reason,
  };
}

/**
 * Customer self-service order cancellation (Phase 10). Ownership is
 * enforced by `cancelOrderForUser` itself (it takes `session.user.id`,
 * not a bare order id — same shape as every other function in this
 * file), and the legality of the transition is enforced there too, from
 * the order's real database status, never from whatever the button's
 * mere presence in the UI implied.
 */
export type CancelOrderResult = { ok: true } | { ok: false; error: string };

export async function cancelOrderAction(orderNumber: string, reason: string): Promise<CancelOrderResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "برای لغو سفارش ابتدا وارد حساب کاربری خود شوید" };
  }

  const trimmedReason = reason.trim().slice(0, 300) || null;

  try {
    await cancelOrderForUser(orderNumber, session.user.id, trimmedReason);
  } catch (error) {
    if (error instanceof OrderNotFoundError || error instanceof InvalidOrderTransitionError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  revalidatePath(`/order/${orderNumber}`);
  revalidatePath("/account/orders");
  return { ok: true };
}
