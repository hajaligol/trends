import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { wishlistItems } from "@/lib/db/schema";
import { getProductSummariesByIds, type CatalogProductSummary } from "@/domains/catalog/queries";

/**
 * The only sanctioned place for application code to read/write
 * `wishlist_items` rows. Every function takes `userId` and scopes by it
 * — same "structurally hard to skip the ownership check" shape as
 * `src/domains/addresses/queries.ts` (there is no `removeFromWishlist`
 * that only takes a `productId`).
 */

/** All of a user's wishlisted product ids — small enough (a personal
 * wishlist, not a catalog scan) to fetch as one plain array; listing
 * pages that need "is this specific product wishlisted" just check
 * `.includes()`/build a `Set` client-side rather than this module taking
 * a `productIds` filter for every caller. */
export async function getWishlistedProductIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId));
  return rows.map((row) => row.productId);
}

/** Full product summaries for the account wishlist page — reuses the
 * catalog domain's existing card read-model (`CatalogProductSummary`) so
 * the wishlist page's cards are pixel-identical to every other product
 * grid, instead of a bespoke shape. */
export async function getWishlistProductsForUser(userId: string): Promise<CatalogProductSummary[]> {
  const productIds = await getWishlistedProductIds(userId);
  if (productIds.length === 0) return [];
  return getProductSummariesByIds(productIds);
}

/** Idempotent: adding an already-wishlisted product is a no-op, not an
 * error — `ON CONFLICT DO NOTHING` against `wishlist_items_user_id_
 * product_id_idx` (rule F.3), not an app-level "does it exist" check
 * first. */
export async function addToWishlist(userId: string, productId: string): Promise<void> {
  await db.insert(wishlistItems).values({ userId, productId }).onConflictDoNothing();
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
}
