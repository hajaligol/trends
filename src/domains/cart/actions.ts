"use server";

import { getCurrentCartIdReadOnly, GuestCartLimitError, resolveCurrentCartId } from "@/domains/cart/resolve";
import {
  addItemToCart,
  clearCart as clearCartRows,
  getCartSummary,
  ProductUnavailableError,
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Upper bound for a single request; stock still caps the real quantity. A
 * missing bound let `1e300` reach SQL and surface as a 500. */
const MAX_QUANTITY = 999;

function isValidQuantity(quantity: unknown, min: number): quantity is number {
  return typeof quantity === "number" && Number.isInteger(quantity) && quantity >= min && quantity <= MAX_QUANTITY;
}

export type CartActionResult = { ok: true; cart: CartSummary } | { ok: false; error: string };

export async function addToCartAction(variantId: string, quantity: number): Promise<CartActionResult> {
  if (!isValidQuantity(quantity, 1) || typeof variantId !== "string" || !UUID_PATTERN.test(variantId)) {
    return { ok: false, error: "تعداد نامعتبر است" };
  }

  let cartId: string;
  try {
    cartId = await resolveCurrentCartId();
  } catch (error) {
    if (error instanceof GuestCartLimitError) return { ok: false, error: error.message };
    throw error;
  }
  try {
    await addItemToCart(cartId, variantId, quantity);
  } catch (error) {
    // Only ever surface the one known, expected condition verbatim (rule
    // A.11/§11 "safe error messages") — anything else (e.g. a genuine
    // unexpected database failure) rethrows, which Next.js turns into a
    // generic digest-only error on the client rather than leaking a raw
    // driver/SQL message. Same discipline as every other domain's
    // `actions.ts` (`InsufficientStockError`, `CouponInvalidError`, etc.).
    if (error instanceof ProductUnavailableError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  return { ok: true, cart: await getCartSummary(cartId) };
}

export async function updateCartItemQuantityAction(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  if (!isValidQuantity(quantity, 0) || typeof itemId !== "string" || !UUID_PATTERN.test(itemId)) {
    return { ok: false, error: "تعداد نامعتبر است" };
  }

  const cartId = await resolveCurrentCartId();
  const updated = await updateCartItemQuantity(cartId, itemId, quantity);
  if (!updated) return { ok: false, error: "این کالا در سبد خرید یافت نشد" };

  return { ok: true, cart: await getCartSummary(cartId) };
}

export async function removeCartItemAction(itemId: string): Promise<CartActionResult> {
  if (typeof itemId !== "string" || !UUID_PATTERN.test(itemId)) {
    return { ok: false, error: "این کالا در سبد خرید یافت نشد" };
  }
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
