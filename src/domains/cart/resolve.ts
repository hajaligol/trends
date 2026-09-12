import { auth } from "@/lib/auth/config";
import {
  createCart,
  getCartByUserId,
  getGuestCartById,
  getOrCreateCartForUser,
} from "@/domains/cart/queries";
import { readGuestCartId, setGuestCartId } from "@/domains/cart/session";

/**
 * Resolves "the cart this request should mutate" — logged-in users
 * always get their own persistent cart (created on first use); a guest
 * gets whatever cart their cookie points at, or a brand-new one (cookie
 * set on the response) if they don't have one yet.
 *
 * **Only callable from a Server Action or Route Handler**, never from a
 * Server Component render — `setGuestCartId` writes a cookie, which
 * Next.js only allows outside of rendering. Read-only cart *display*
 * (the cart drawer's contents) goes through `getCurrentCartIdReadOnly`
 * below instead, which never creates anything.
 */
export async function resolveCurrentCartId(): Promise<string> {
  const session = await auth();

  if (session?.user) {
    const cart = await getOrCreateCartForUser(session.user.id);
    return cart.id;
  }

  const existingGuestCartId = await readGuestCartId();
  if (existingGuestCartId) {
    const guestCart = await getGuestCartById(existingGuestCartId);
    if (guestCart) return guestCart.id;
    // Cookie pointed at a cart that's gone (merged away, expired, or —
    // defensively — actually belongs to a user now) — fall through and
    // issue a fresh one rather than trusting it.
  }

  const cart = await createCart(null);
  await setGuestCartId(cart.id);
  return cart.id;
}

// Logged-in users' carts are looked up, not lazily created, on a plain
// read — a signed-in customer who's never added anything shouldn't
// spawn an empty `carts` row just by loading a page. `resolveCurrentCartId`
// (the write path, used by every mutation) is what actually creates it
// on first add-to-cart.
async function getCartIdForUserReadOnly(userId: string): Promise<string | null> {
  const cart = await getCartByUserId(userId);
  return cart?.id ?? null;
}

/**
 * Read-only resolution for rendering/GET use: returns an existing cart
 * id or `null`, but never creates a row or sets a cookie (both
 * forbidden during a render). A visitor who's never added anything
 * simply has no cart yet, and `getCartSummary(null)` already returns an
 * empty summary for that case.
 */
export async function getCurrentCartIdReadOnly(): Promise<string | null> {
  const session = await auth();
  if (session?.user) return getCartIdForUserReadOnly(session.user.id);
  return readGuestCartId();
}
