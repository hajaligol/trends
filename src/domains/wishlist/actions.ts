"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { addToWishlist, getWishlistedProductIds, removeFromWishlist } from "@/domains/wishlist/queries";

/**
 * Called directly from the client (`WishlistButton`'s click handler),
 * not via a `<form>`/`useActionState` — there's no form here, just a
 * toggle button, so a plain async function call is the right shape (the
 * same pattern `logoutAction` already uses for a no-form mutation).
 *
 * Re-checks `auth()` itself rather than trusting that the client only
 * calls this when signed in (rule A.9/"Server Actions still require
 * authentication checks") — `WishlistButton` already only calls this
 * when `isAuthenticated` is true, but that's a UI nicety, not the
 * security boundary.
 */
export type ToggleWishlistResult = { ok: true } | { ok: false; error: string };

export async function toggleWishlistAction(
  productId: string,
  shouldBeActive: boolean,
): Promise<ToggleWishlistResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "برای افزودن به علاقه‌مندی‌ها ابتدا وارد شوید" };
  }

  if (shouldBeActive) {
    await addToWishlist(session.user.id, productId);
  } else {
    await removeFromWishlist(session.user.id, productId);
  }

  revalidatePath("/account/wishlist");
  return { ok: true };
}

/**
 * Used by `WishlistProvider`'s initial client-side load (called once per
 * page load from `useEffect`, the same "fetch client-side to avoid
 * forcing `auth()`/`cookies()` into a Server Component render and
 * losing static generation" approach Phase 6 established for
 * `useSession()` in the Header — see `AuthSessionProvider`'s comment).
 * Returns an empty array for a signed-out visitor rather than an error —
 * "no wishlist yet" is the correct, unremarkable answer for a guest.
 */
export async function getWishlistedProductIdsAction(): Promise<string[]> {
  const session = await auth();
  if (!session?.user) return [];
  return getWishlistedProductIds(session.user.id);
}
