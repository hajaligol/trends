import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cartItems } from "@/lib/db/schema";
import { getCartByUserId, getGuestCartById, createCart, deleteCart } from "@/domains/cart/queries";

/**
 * Merges a guest cart's lines into `userId`'s cart, then deletes the
 * guest cart row — a user should never end up with two carts, and
 * nothing already in their account cart should be lost or silently
 * dropped just because they happened to add a few things before logging
 * in (TRENDS_PROJECT_CONTEXT.md §6 "Cart" — "merge guest cart into user
 * cart after login").
 *
 * Quantities are **summed**, not overwritten (an item already in both
 * carts becomes one line with the combined quantity, capped at live
 * stock by the same `least(...)` upsert `addItemToCart` uses) — the
 * customer picked both quantities on purpose, dropping either would be
 * surprising. Called from `loginAction`/`registerAction`
 * (`src/domains/auth/actions.ts`) right after a successful sign-in.
 *
 * Safe to call with no guest cart at all (`guestCartId: null`) — a no-op
 * returning the user's own cart id (creating an empty one only if this
 * is genuinely their first cart), so call sites don't need a separate
 * "did they even have a guest cart" branch.
 */
export async function mergeGuestCartIntoUserCart(
  guestCartId: string | null,
  userId: string,
): Promise<string> {
  const userCart = (await getCartByUserId(userId)) ?? (await createCart(userId));

  if (!guestCartId) return userCart.id;

  const guestCart = await getGuestCartById(guestCartId);
  if (!guestCart) return userCart.id; // Stale/foreign cookie — nothing to merge.

  await db.transaction(async (tx) => {
    const guestLines = await tx
      .select({ variantId: cartItems.variantId, quantity: cartItems.quantity })
      .from(cartItems)
      .where(eq(cartItems.cartId, guestCart.id));

    for (const line of guestLines) {
      await tx
        .insert(cartItems)
        .values({ cartId: userCart.id, variantId: line.variantId, quantity: line.quantity })
        .onConflictDoUpdate({
          target: [cartItems.cartId, cartItems.variantId],
          set: {
            quantity: sql`${cartItems.quantity} + ${line.quantity}`,
            updatedAt: new Date(),
          },
        });
    }
  });

  await deleteCart(guestCart.id);
  return userCart.id;
}
