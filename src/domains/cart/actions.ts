"use server";

import { getCurrentCartIdReadOnly, resolveCurrentCartId } from "@/domains/cart/resolve";
import {
  addItemToCart,
  clearCart as clearCartRows,
  getCartSummary,
  removeCartItem,
  updateCartItemQuantity,
  type CartSummary,
} from "@/domains/cart/queries";

/**
 * Cart mutations, called directly from client components (`CartProvider`,
 * `VariantSelector`'s "add to cart" button) rather than through a
 * `<form>` — the cart drawer/quantity steppers aren't form submissions,
 * they're immediate button clicks, same shape as `logoutAction`/
 * `toggleWishlistAction`.
 *
 * Every action here re-resolves "which cart" itself
 * (`resolveCurrentCartId`, which reads the real session/cookie) rather
 * than accepting a `cartId` argument from the caller — a client-supplied
 * cart id would let one browser tamper with another cart by guessing an
 * id, the same ownership-check principle `addresses/actions.ts` and
 * `wishlist/actions.ts` already follow. Every action returns the fresh
 * `CartSummary` on success so the caller can update its UI from the
 * response directly, without a second round trip.
 */

export type CartActionResult = { ok: true; cart: CartSummary } | { ok: false; error: string };

export async function addToCartAction(variantId: string, quantity: number): Promise<CartActionResult> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: "تعداد نامعتبر است" };
  }

  const cartId = await resolveCurrentCartId();
  try {
    await addItemToCart(cartId, variantId, quantity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "افزودن به سبد خرید ممکن نشد";
    return { ok: false, error: message };
  }

  return { ok: true, cart: await getCartSummary(cartId) };
}

export async function updateCartItemQuantityAction(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  if (!Number.isInteger(quantity) || quantity < 0) {
    return { ok: false, error: "تعداد نامعتبر است" };
  }

  const cartId = await resolveCurrentCartId();
  const updated = await updateCartItemQuantity(cartId, itemId, quantity);
  if (!updated) return { ok: false, error: "این کالا در سبد خرید یافت نشد" };

  return { ok: true, cart: await getCartSummary(cartId) };
}

export async function removeCartItemAction(itemId: string): Promise<CartActionResult> {
  const cartId = await resolveCurrentCartId();
  await removeCartItem(cartId, itemId);
  return { ok: true, cart: await getCartSummary(cartId) };
}

export async function clearCartAction(): Promise<CartActionResult> {
  const cartId = await resolveCurrentCartId();
  await clearCartRows(cartId);
  return { ok: true, cart: await getCartSummary(cartId) };
}

/** Used by `CartProvider`'s initial client-side load and by anything
 * else that just needs the current cart without mutating it. Thin
 * re-export so call sites (and the `/api/cart` route handler) don't need
 * to know about `getCurrentCartIdReadOnly` directly. */
export async function getCurrentCartAction(): Promise<CartSummary> {
  const cartId = await getCurrentCartIdReadOnly();
  return getCartSummary(cartId);
}
