"use server";

import { auth } from "@/lib/auth/config";
import { getAddressForUser } from "@/domains/addresses/queries";
import { getCurrentCartIdReadOnly } from "@/domains/cart/resolve";
import { getCartSummary } from "@/domains/cart/queries";
import { getShippingMethod } from "@/domains/shipping/methods";
import {
  createOrderFromCart,
  EmptyCartError,
  InsufficientStockError,
  type ShippingSnapshotInput,
} from "@/domains/orders/queries";
import { getPaymentProvider } from "@/domains/payments/provider";

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
  | { ok: true; orderNumber: string; paymentNote: string }
  | { ok: false; error: string };

export async function placeOrderAction(
  addressId: string,
  shippingMethodCode: string,
  customerNote: string,
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

  let order;
  try {
    order = await createOrderFromCart(
      cartId!,
      session.user.id,
      shippingSnapshot,
      shippingMethod,
      trimmedNote,
    );
  } catch (error) {
    if (error instanceof InsufficientStockError || error instanceof EmptyCartError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  // Payment is Phase 9 (rule A.17 — no real gateway exists yet). The
  // order is created as `pending_payment`; `initiate()` always reports
  // "not configured" from the stub provider, and its message is exactly
  // what's shown on the confirmation page, so there's one honest source
  // of truth for that copy instead of duplicating it here.
  const paymentResult = await getPaymentProvider().initiate({
    id: order.id,
    orderNumber: order.orderNumber,
    totalToman: order.totalToman,
  });

  return {
    ok: true,
    orderNumber: order.orderNumber,
    paymentNote: paymentResult.ok
      ? "در حال انتقال به درگاه پرداخت..."
      : paymentResult.reason,
  };
}
