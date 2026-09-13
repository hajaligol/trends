import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  cartItems,
  orderItems,
  orders,
  productImages,
  productVariants,
  products,
  type NewOrderItem,
  type Order,
  type OrderItem,
} from "@/lib/db/schema";
import type { ShippingMethod } from "@/domains/shipping/methods";
import { CouponInvalidError, recordCouponRedemption, validateCoupon } from "@/domains/promotions/queries";

/**
 * The only sanctioned place for application code to read/write `orders`/
 * `order_items` rows — same "structurally hard to skip the ownership
 * check" shape as `cart/queries.ts`/`addresses/queries.ts`: every read
 * here that returns a single order takes a `userId` and scopes by it.
 */

export class InsufficientStockError extends Error {
  constructor(public readonly productTitle: string, public readonly available: number) {
    super(`موجودی «${productTitle}» کافی نیست (${available} عدد باقی مانده)`);
    this.name = "InsufficientStockError";
  }
}

export class EmptyCartError extends Error {
  constructor() {
    super("سبد خرید شما خالی است");
    this.name = "EmptyCartError";
  }
}

/** Human-friendly order number (§8: distinct from the internal uuid,
 * §6 "Do not expose internal IDs unnecessarily in public URLs"). Format:
 * `TR-YYMMDD-XXXX` — a 4-digit random suffix keeps it short while the
 * date prefix makes it sortable/recognizable at a glance; the *actual*
 * uniqueness guarantee is the database's unique index
 * (`orders_order_number_idx`), not this generator, so a retry-on-collision
 * loop (astronomically unlikely at this scale, but not assumed away) is
 * what `createOrderFromCart` uses it with. */
function generateOrderNumber(): string {
  const now = new Date();
  const datePart = [now.getUTCFullYear() % 100, now.getUTCMonth() + 1, now.getUTCDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `TR-${datePart}-${randomPart}`;
}

export type ShippingSnapshotInput = {
  recipientName: string;
  recipientMobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  plaqueUnitDetails: string | null;
  deliveryNotes: string | null;
};

/**
 * Creates an order from `cartId`'s current contents, inside one
 * transaction that:
 *
 * 1. Re-reads each line's live price/stock (never trusts anything the
 *    client displayed — TRENDS_PROJECT_CONTEXT.md §4.3), the same way
 *    `getCartSummary` does, but this time to freeze it into a snapshot.
 * 2. Decrements `product_variants.stock` **conditionally**
 *    (`WHERE stock >= quantity`) rather than a read-then-write pair —
 *    this is what makes it concurrency-safe (§8 acceptance: "cannot
 *    checkout unavailable inventory"). If two checkouts race for the
 *    last unit, exactly one `UPDATE` matches a row; the loser's
 *    `RETURNING` comes back empty and this function throws
 *    `InsufficientStockError`, rolling back the whole transaction — the
 *    order is never partially created.
 * 3. Inserts `orders` + `order_items` with the frozen snapshot.
 * 4. Clears the cart.
 *
 * Any thrown error rolls back every step above via Postgres's
 * transaction semantics — an order is never left half-created with
 * decremented stock but no rows, or vice versa.
 */
export async function createOrderFromCart(
  cartId: string,
  userId: string,
  shipping: ShippingSnapshotInput,
  shippingMethod: ShippingMethod,
  customerNote: string | null,
  // `couponCode: null` (no coupon) is the common case. Re-throws
  // `CouponInvalidError` as-is when a code is supplied but no longer
  // valid at the moment of placing the order (§4.3 — the checkout-preview
  // validation in `promotions/actions.ts` is advisory only; this is the
  // authoritative check) so `placeOrderAction` can surface the same
  // Persian message it would have shown at preview time.
  couponCode: string | null = null,
): Promise<Order> {
  return db.transaction(async (tx) => {
    const lines = await tx
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productTitle: products.title,
        productSlug: products.slug,
        sku: productVariants.sku,
        size: productVariants.size,
        color: productVariants.color,
        priceToman: productVariants.priceToman,
        compareAtPriceToman: productVariants.compareAtPriceToman,
        stock: productVariants.stock,
        variantActive: productVariants.isActive,
        productActive: products.isActive,
        requestedQuantity: cartItems.quantity,
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(cartItems.cartId, cartId));

    if (lines.length === 0) throw new EmptyCartError();

    for (const line of lines) {
      if (!line.variantActive || !line.productActive) {
        throw new InsufficientStockError(line.productTitle, 0);
      }
      if (line.stock < line.requestedQuantity) {
        throw new InsufficientStockError(line.productTitle, line.stock);
      }
    }

    // Batched image lookup, same pattern as `cart/queries.ts`'s
    // `getCartSummary` — one query instead of N.
    const productIds = [...new Set(lines.map((line) => line.productId))];
    const imageRows = await tx
      .select({ productId: productImages.productId, url: productImages.url })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(productImages.displayOrder);
    const firstImageByProduct = new Map<string, string>();
    for (const image of imageRows) {
      if (!firstImageByProduct.has(image.productId)) firstImageByProduct.set(image.productId, image.url);
    }

    // Conditional, concurrency-safe decrement — see the function header
    // comment. Runs *after* the pre-check above (which gives a fast,
    // friendly error in the common uncontested case) but is what
    // actually prevents overselling under a real race.
    for (const line of lines) {
      const decremented = await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} - ${line.requestedQuantity}`, updatedAt: new Date() })
        .where(
          and(eq(productVariants.id, line.variantId), sql`${productVariants.stock} >= ${line.requestedQuantity}`),
        )
        .returning({ id: productVariants.id });
      if (decremented.length === 0) {
        const [current] = await tx
          .select({ stock: productVariants.stock })
          .from(productVariants)
          .where(eq(productVariants.id, line.variantId))
          .limit(1);
        throw new InsufficientStockError(line.productTitle, current?.stock ?? 0);
      }
    }

    const subtotalToman = lines.reduce((sum, line) => sum + line.priceToman * line.requestedQuantity, 0);

    // Coupon validation happens *inside* this transaction, against the
    // real subtotal computed above, and with `coupons` locked
    // (`FOR UPDATE`, see `promotions/queries.ts`) for the rest of the
    // transaction — so a coupon whose usage limit fills up in a race
    // with another checkout is caught here, not just at preview time.
    // Any thrown `CouponInvalidError` rolls back the stock decrement
    // above along with everything else (§4.3 — an invalid coupon must
    // not partially apply).
    let discountToman = 0;
    let appliedCouponId: string | null = null;
    if (couponCode) {
      const { coupon, discountToman: computedDiscount } = await validateCoupon(tx, couponCode, userId, subtotalToman);
      discountToman = computedDiscount;
      appliedCouponId = coupon.id;
    }

    const totalToman = Math.max(0, subtotalToman + shippingMethod.feeToman - discountToman);

    let order: Order | undefined;
    // Retry once on the astronomically unlikely order-number collision
    // (see `generateOrderNumber`'s comment) rather than trusting the
    // generator's randomness alone.
    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      try {
        const [row] = await tx
          .insert(orders)
          .values({
            orderNumber: generateOrderNumber(),
            userId,
            status: "pending_payment",
            recipientName: shipping.recipientName,
            recipientMobile: shipping.recipientMobile,
            province: shipping.province,
            city: shipping.city,
            addressLine: shipping.addressLine,
            postalCode: shipping.postalCode,
            plaqueUnitDetails: shipping.plaqueUnitDetails,
            deliveryNotes: shipping.deliveryNotes,
            shippingMethodCode: shippingMethod.code,
            shippingMethodLabel: shippingMethod.label,
            shippingEstimateLabel: shippingMethod.estimateLabel,
            subtotalToman,
            shippingFeeToman: shippingMethod.feeToman,
            discountToman,
            totalToman,
            couponId: appliedCouponId,
            couponCode: appliedCouponId ? couponCode!.trim().toUpperCase() : null,
            customerNote,
          })
          .returning();
        order = row;
      } catch (error) {
        const isUniqueViolation =
          error instanceof Error && "code" in error && (error as { code?: string }).code === "23505";
        if (!isUniqueViolation) throw error;
      }
    }
    if (!order) throw new Error("Order creation failed after retries (order number collision)");

    if (appliedCouponId) {
      // Written only after the order row exists — see
      // `recordCouponRedemption`'s header comment.
      await recordCouponRedemption(tx, appliedCouponId, userId, order.id);
    }

    const newItems: NewOrderItem[] = lines.map((line) => ({
      orderId: order!.id,
      productId: line.productId,
      variantId: line.variantId,
      productTitle: line.productTitle,
      productSlug: line.productSlug,
      sku: line.sku,
      size: line.size,
      color: line.color,
      imageUrl: firstImageByProduct.get(line.productId) ?? null,
      unitPriceToman: line.priceToman,
      compareAtPriceToman: line.compareAtPriceToman,
      quantity: line.requestedQuantity,
      lineTotalToman: line.priceToman * line.requestedQuantity,
    }));
    await tx.insert(orderItems).values(newItems);

    await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));

    return order;
  });
}

export type OrderWithItems = Order & { items: OrderItem[] };

export async function getOrderForUser(orderNumber: string, userId: string): Promise<OrderWithItems | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, userId)))
    .limit(1);
  if (!order) return null;

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

export async function listOrdersForUser(userId: string): Promise<Order[]> {
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}
