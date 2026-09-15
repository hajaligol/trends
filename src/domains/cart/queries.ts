import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cartItems, carts, productImages, productVariants, products, type Cart } from "@/lib/db/schema";
import type { StockState } from "@/domains/catalog/queries";

/**
 * The one error `addItemToCart` throws for an expected, user-facing
 * condition (product deactivated / out of stock) — a distinct class so
 * `cart/actions.ts` can `instanceof`-check it and safely surface its
 * Persian message to the client, the same "only re-throw a known, safe
 * error type verbatim" discipline every other domain's actions.ts file
 * uses (`InsufficientStockError`, `CouponInvalidError`, etc.). Any other
 * error (e.g. a genuine unexpected database failure) is deliberately
 * NOT this class, so it is never mistaken for a safe, presentable
 * message (CLAUDE_BUILD_INSTRUCTIONS.txt §11 "safe error messages" —
 * never leak raw driver/SQL details to a customer).
 */
export class ProductUnavailableError extends Error {}

/**
 * The only sanctioned place for application code to read/write `carts`/
 * `cart_items` rows — components/actions call these, never the Drizzle
 * client directly, mirroring `src/domains/catalog/queries.ts` and
 * `src/domains/addresses/queries.ts`'s existing pattern.
 *
 * There is no `getCartItem(id)` without a `cartId` — every mutation here
 * takes the resolved cart's id and scopes by it, the same "structurally
 * hard to skip the ownership check" shape `addresses/queries.ts` uses,
 * just for cart ownership instead of user ownership (a cart's owner is
 * "whoever holds its id/cookie or is its `userId`", resolved once by
 * `src/domains/cart/resolve.ts` before any of these run).
 */

export async function getCartByUserId(userId: string): Promise<Cart | null> {
  const [row] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  return row ?? null;
}

export async function getCartById(cartId: string): Promise<Cart | null> {
  const [row] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
  return row ?? null;
}

/** A guest cart is any cart row with `userId: null`. Used to make sure a
 * cookie value naming some *other* user's cart can never be adopted as a
 * "guest" cart. */
export async function getGuestCartById(cartId: string): Promise<Cart | null> {
  const cart = await getCartById(cartId);
  return cart && cart.userId === null ? cart : null;
}

export async function createCart(userId: string | null): Promise<Cart> {
  const [row] = await db.insert(carts).values({ userId }).returning();
  if (!row) throw new Error("Cart insert returned no row");
  return row;
}

export async function getOrCreateCartForUser(userId: string): Promise<Cart> {
  const existing = await getCartByUserId(userId);
  if (existing) return existing;
  return createCart(userId);
}

export async function deleteCart(cartId: string): Promise<void> {
  await db.delete(carts).where(eq(carts.id, cartId));
}

export type CartLineItem = {
  itemId: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  size: string;
  color: string;
  colorHex: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  unitPriceToman: number;
  compareAtPriceToman: number | null;
  requestedQuantity: number;
  /** `min(requestedQuantity, stock)` when the line is available at all —
   * this, not `requestedQuantity`, is what totals are computed from.
   * See `cart-items.ts`'s header comment: price/stock are never
   * snapshotted onto the cart row, so this is recomputed on every read. */
  effectiveQuantity: number;
  lineTotalToman: number;
  stock: number;
  stockState: StockState;
  /** `false` if the variant or its product has been deactivated since
   * being added — the line stays visible (so the customer can remove it)
   * but contributes nothing to the subtotal. */
  isAvailable: boolean;
  /** `true` when live stock is lower than what's actually in the cart —
   * surfaced so the UI can say "only N left" instead of silently
   * charging for fewer than the customer thinks they have. */
  isQuantityReduced: boolean;
};

export type CartSummary = {
  cartId: string | null;
  items: CartLineItem[];
  itemCount: number;
  subtotalToman: number;
};

const EMPTY_SUMMARY: CartSummary = { cartId: null, items: [], itemCount: 0, subtotalToman: 0 };

function stockStateFor(stock: number, lowStockThreshold: number): StockState {
  if (stock <= 0) return "out-of-stock";
  if (stock <= lowStockThreshold) return "low-stock";
  return "in-stock";
}

/**
 * Builds the authoritative, display-ready view of a cart: live
 * price/stock joined in from `product_variants` at read time (never a
 * stored snapshot — see `cart-items.ts`), one batched image lookup
 * instead of N per-line queries (same `inArray` batching pattern as
 * `catalog/queries.ts`'s `loadProductSummaries`).
 */
export async function getCartSummary(cartId: string | null): Promise<CartSummary> {
  if (!cartId) return EMPTY_SUMMARY;

  const rows = await db
    .select({
      itemId: cartItems.id,
      requestedQuantity: cartItems.quantity,
      variantId: productVariants.id,
      size: productVariants.size,
      color: productVariants.color,
      colorHex: productVariants.colorHex,
      priceToman: productVariants.priceToman,
      compareAtPriceToman: productVariants.compareAtPriceToman,
      stock: productVariants.stock,
      lowStockThreshold: productVariants.lowStockThreshold,
      variantActive: productVariants.isActive,
      productId: products.id,
      productSlug: products.slug,
      productTitle: products.title,
      productActive: products.isActive,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt));

  if (rows.length === 0) return { ...EMPTY_SUMMARY, cartId };

  const productIds = [...new Set(rows.map((row) => row.productId))];
  const imageRows = await db
    .select({ productId: productImages.productId, url: productImages.url, altText: productImages.altText })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.displayOrder));

  const firstImageByProduct = new Map<string, { url: string; altText: string }>();
  for (const image of imageRows) {
    if (!firstImageByProduct.has(image.productId)) {
      firstImageByProduct.set(image.productId, { url: image.url, altText: image.altText });
    }
  }

  let subtotalToman = 0;
  let itemCount = 0;

  const items: CartLineItem[] = rows.map((row) => {
    const isAvailable = row.variantActive && row.productActive && row.stock > 0;
    const effectiveQuantity = isAvailable ? Math.min(row.requestedQuantity, row.stock) : 0;
    const lineTotalToman = effectiveQuantity * row.priceToman;
    const image = firstImageByProduct.get(row.productId) ?? null;

    subtotalToman += lineTotalToman;
    itemCount += effectiveQuantity;

    return {
      itemId: row.itemId,
      variantId: row.variantId,
      productId: row.productId,
      productSlug: row.productSlug,
      productTitle: row.productTitle,
      size: row.size,
      color: row.color,
      colorHex: row.colorHex,
      imageUrl: image?.url ?? null,
      imageAlt: image?.altText ?? null,
      unitPriceToman: row.priceToman,
      compareAtPriceToman: row.compareAtPriceToman,
      requestedQuantity: row.requestedQuantity,
      effectiveQuantity,
      lineTotalToman,
      stock: row.stock,
      stockState: stockStateFor(row.stock, row.lowStockThreshold),
      isAvailable,
      isQuantityReduced: isAvailable && effectiveQuantity < row.requestedQuantity,
    };
  });

  return { cartId, items, itemCount, subtotalToman };
}

/** Live variant lookup used before trusting any client-submitted
 * `variantId`/quantity (rule A.11 — never trust client price/stock). */
export async function getSellableVariant(variantId: string) {
  const [row] = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      stock: productVariants.stock,
      isActive: productVariants.isActive,
      productIsActive: products.isActive,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(productVariants.id, variantId))
    .limit(1);
  return row ?? null;
}

/**
 * Adds `quantity` of `variantId` to the cart, capped at live stock,
 * or increments the existing line's quantity (also capped) if that
 * variant is already in the cart — one upsert via `ON CONFLICT`
 * (rule F.3: let Postgres enforce "one row per variant per cart", see
 * `cart_items_cart_id_variant_id_idx`) rather than a
 * select-then-insert-or-update race.
 */
export async function addItemToCart(
  cartId: string,
  variantId: string,
  quantity: number,
): Promise<void> {
  const variant = await getSellableVariant(variantId);
  if (!variant || !variant.isActive || !variant.productIsActive) {
    throw new ProductUnavailableError("این محصول در حال حاضر قابل خرید نیست");
  }
  if (variant.stock <= 0) {
    throw new ProductUnavailableError("این محصول ناموجود است");
  }

  const cappedQuantity = Math.max(1, Math.min(quantity, variant.stock));

  await db
    .insert(cartItems)
    .values({ cartId, variantId, quantity: cappedQuantity })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId],
      set: {
        quantity: sql`least(${cartItems.quantity} + ${cappedQuantity}, ${variant.stock})`,
        updatedAt: new Date(),
      },
    });
}

/** `quantity <= 0` deletes the line. Returns `false` if `itemId` doesn't
 * belong to `cartId` (not found / not yours) so the caller can
 * distinguish that from a real failure — same contract as
 * `deleteAddressForUser`. */
export async function updateCartItemQuantity(
  cartId: string,
  itemId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) {
    const deleted = await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
      .returning({ id: cartItems.id });
    return deleted.length > 0;
  }

  const [existing] = await db
    .select({ variantId: cartItems.variantId })
    .from(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
    .limit(1);
  if (!existing) return false;

  const variant = await getSellableVariant(existing.variantId);
  const cappedQuantity = variant ? Math.max(1, Math.min(quantity, Math.max(variant.stock, 1))) : quantity;

  const updated = await db
    .update(cartItems)
    .set({ quantity: cappedQuantity, updatedAt: new Date() })
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
    .returning({ id: cartItems.id });
  return updated.length > 0;
}

export async function removeCartItem(cartId: string, itemId: string): Promise<boolean> {
  const deleted = await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
    .returning({ id: cartItems.id });
  return deleted.length > 0;
}

export async function clearCart(cartId: string): Promise<void> {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}
