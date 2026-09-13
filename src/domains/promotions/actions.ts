"use server";

import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { getCurrentCartIdReadOnly } from "@/domains/cart/resolve";
import { getCartSummary } from "@/domains/cart/queries";
import { CouponInvalidError, validateCoupon } from "@/domains/promotions/queries";

/**
 * A read-only checkout-preview action: "does this code work for my
 * current cart, and how much would it save". It never redeems anything
 * (no `coupon_redemptions` row is written here) — the client shows this
 * result purely for UX (an updated total before placing the order); the
 * authoritative check + the actual redemption both happen again, inside
 * `createOrderFromCart`'s transaction, when `placeOrderAction` runs. A
 * coupon that validates here could still fail at that point (e.g. its
 * usage limit fills up in the few seconds between preview and placing
 * the order) — that's correct, not a bug, per §4.3 "server is
 * authoritative".
 */
export type CouponPreviewResult =
  | { ok: true; code: string; discountToman: number }
  | { ok: false; error: string };

export async function previewCouponAction(rawCode: string): Promise<CouponPreviewResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "برای استفاده از کد تخفیف ابتدا وارد حساب کاربری خود شوید" };
  }

  const cartId = await getCurrentCartIdReadOnly();
  const cart = await getCartSummary(cartId);
  if (cart.items.length === 0) {
    return { ok: false, error: "سبد خرید شما خالی است" };
  }

  try {
    const { coupon, discountToman } = await validateCoupon(db, rawCode, session.user.id, cart.subtotalToman);
    return { ok: true, code: coupon.code, discountToman };
  } catch (error) {
    if (error instanceof CouponInvalidError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
