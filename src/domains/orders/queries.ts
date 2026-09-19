import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, type DbTransaction } from "@/lib/db/client";
import {
  cartItems,
  orderItems,
  orderStatusHistory,
  orders,
  productImages,
  productVariants,
  products,
  type NewOrderItem,
  type Order,
  type OrderItem,
  type OrderStatusHistoryRow,
} from "@/lib/db/schema";
import type { ShippingMethod } from "@/domains/shipping/methods";
import { CouponInvalidError, recordCouponRedemption, validateCoupon } from "@/domains/promotions/queries";
import { canAdminTransition, canCustomerCancel, type OrderStatus } from "@/domains/orders/lifecycle";
import { notifyEvent } from "@/domains/notifications/provider";

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

export class OrderNotFoundError extends Error {
  constructor() {
    super("سفارش یافت نشد");
    this.name = "OrderNotFoundError";
  }
}

/** Thrown when a requested status transition isn't legal from the
 * order's *current* database status — see
 * `src/domains/orders/lifecycle.ts` for the actual transition table.
 * Never constructed from a client-trusted "current status"; the
 * transaction that throws this always re-reads the real row first. */
export class InvalidOrderTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`امکان تغییر وضعیت سفارش از «${from}» به «${to}» وجود ندارد`);
    this.name = "InvalidOrderTransitionError";
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
  const order = await db.transaction(async (tx) => {
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

  // Outside the transaction, after commit — a notification failure must
  // never roll back an already-successfully-placed order (see
  // `notifyEvent`'s own header comment on why it never throws).
  await notifyEvent({
    type: "order_confirmed",
    mobile: order.recipientMobile,
    orderNumber: order.orderNumber,
    totalToman: order.totalToman,
  });

  return order;
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

/** The few fields an order summary needs to show what was ordered. Read
 * from the `order_items` snapshot columns (frozen at purchase time), so it
 * stays correct even if the product is later renamed or deleted. */
export type OrderItemPreview = Pick<OrderItem, "id" | "productTitle" | "productSlug" | "imageUrl" | "quantity">;

/**
 * Item previews (thumbnail + title) for a set of orders, grouped by order
 * id, in the order the items were added — one batched query instead of one
 * per order. **Ownership:** this takes order ids, not a user id, so callers
 * must pass only ids that came from a user-scoped read such as
 * `listOrdersForUser(userId)`; it never accepts ids from request input.
 */
export async function getOrderItemPreviews(orderIds: string[]): Promise<Map<string, OrderItemPreview[]>> {
  const byOrder = new Map<string, OrderItemPreview[]>();
  if (orderIds.length === 0) return byOrder;

  const rows = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productTitle: orderItems.productTitle,
      productSlug: orderItems.productSlug,
      imageUrl: orderItems.imageUrl,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.createdAt), asc(orderItems.id));

  for (const { orderId, ...preview } of rows) {
    const bucket = byOrder.get(orderId);
    if (bucket) {
      bucket.push(preview);
    } else {
      byOrder.set(orderId, [preview]);
    }
  }
  return byOrder;
}

/** Ownership-scoped, same shape as everything else in this file — a
 * customer can only ever read their *own* order's timeline. */
export async function getOrderStatusHistoryForUser(
  orderNumber: string,
  userId: string,
): Promise<OrderStatusHistoryRow[]> {
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, userId)))
    .limit(1);
  if (!order) return [];
  return db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, order.id))
    .orderBy(orderStatusHistory.createdAt);
}

/** Not ownership-scoped by design — callers (admin Server Actions/pages)
 * are responsible for checking `session.user.role` themselves before
 * calling this, the same way `src/domains/promotions/queries.ts` and
 * every payment function in this codebase separate "is this data valid"
 * from "is this caller allowed to see it." */
export async function getOrderStatusHistoryForOrder(orderId: string): Promise<OrderStatusHistoryRow[]> {
  return db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(orderStatusHistory.createdAt);
}

export async function getOrderByOrderNumberForAdmin(orderNumber: string): Promise<OrderWithItems | null> {
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

export type AdminOrderListFilter = {
  status?: OrderStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AdminOrderListPage = {
  rows: Order[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Paginated/filterable/searchable admin order list — the Phase 11
 * "orders" admin task this file's own previous comment (see git
 * history) pointed to. Search matches `orderNumber` or the snapshotted
 * `recipientMobile` on the order row itself (not a join to `users`,
 * since orders keep their own immutable customer snapshot per Phase 8 —
 * searching the live `users` table could miss an order whose customer
 * later changed their profile mobile, which searching the snapshot
 * never does).
 */
export async function listOrdersForAdmin({ status, search, page = 1, pageSize = 20 }: AdminOrderListFilter = {}): Promise<AdminOrderListPage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const conditions = [];
  if (status) conditions.push(eq(orders.status, status));
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(orders.orderNumber, term), ilike(orders.recipientMobile, term)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    // Real `COUNT(*)` (Phase 13 query-review fix) instead of selecting
    // every matching order's id just to take `.length`.
    db.select({ total: count() }).from(orders).where(where),
  ]);

  return { rows, page: safePage, pageSize: safePageSize, total: totalRows[0]?.total ?? 0 };
}

/** Restocks every line of a cancelled order back onto its variant — the
 * inverse of `createOrderFromCart`'s conditional decrement. Called only
 * from inside the same transaction that flips an order to `cancelled`
 * (`cancelOrderForUser`/`adminTransitionOrderStatus` below), so a
 * cancellation and its restock can never be split by a crash between
 * them. Lines whose `variantId` is `null` (the live variant was since
 * deleted — `order_items.variantId` is `onDelete: "set null"`, see that
 * file's header comment) are skipped: there is no live row left to
 * restock onto. */
async function restockCancelledOrderItems(tx: DbTransaction, orderId: string): Promise<void> {
  const items = await tx
    .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    if (!item.variantId) continue;
    await tx
      .update(productVariants)
      .set({ stock: sql`${productVariants.stock} + ${item.quantity}`, updatedAt: new Date() })
      .where(eq(productVariants.id, item.variantId));
  }
}

/**
 * Customer self-service cancellation. Re-reads the order's *current*
 * status inside the transaction (`FOR UPDATE`, so a concurrent admin
 * transition on the same order serializes against this rather than
 * racing it) and validates the transition against
 * `canCustomerCancel` — never trusts that the UI merely hid the button
 * for an uncancellable order. Restocks inventory (see
 * `restockCancelledOrderItems`) since a cancelled order's reserved units
 * genuinely become available again — TRENDS_PROJECT_CONTEXT.md's
 * inventory model has no separate "reserved" column yet (documented in
 * Phase 8's known limitations), so this restock is the correct
 * counterpart to `createOrderFromCart`'s decrement in that same model.
 */
export async function cancelOrderForUser(orderNumber: string, userId: string, reason: string | null): Promise<Order> {
  const order = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, userId)))
      .for("update")
      .limit(1);
    if (!current) throw new OrderNotFoundError();
    if (!canCustomerCancel(current.status)) {
      throw new InvalidOrderTransitionError(current.status, "cancelled");
    }

    const [updated] = await tx
      .update(orders)
      .set({ status: "cancelled", cancelReason: reason, cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, current.id))
      .returning();
    if (!updated) throw new Error("Order cancel update returned no row");

    await tx.insert(orderStatusHistory).values({
      orderId: current.id,
      fromStatus: current.status,
      toStatus: "cancelled",
      actorRole: "customer",
      actorUserId: userId,
      note: reason,
    });

    await restockCancelledOrderItems(tx, current.id);

    return updated;
  });

  await notifyEvent({ type: "order_cancelled", mobile: order.recipientMobile, orderNumber: order.orderNumber });
  return order;
}

export type AdminTransitionInput = {
  trackingNumber?: string | null;
  note?: string | null;
};

/**
 * Admin/staff-only status transition — callers (Server Actions) must
 * check `session.user.role` themselves before calling this; this
 * function's own job is only "is this a legal transition from the
 * order's real current status," the same separation of concerns as
 * `validateCoupon`/payment verification elsewhere in this codebase.
 * `toStatus` is validated against `canAdminTransition`, so a forged
 * request naming an illegal target status (e.g. jumping straight to
 * `delivered`, or setting `paid` — never a legal *target* here at all,
 * see `lifecycle.ts`'s header comment) is rejected before any write.
 */
export async function adminTransitionOrderStatus(
  orderNumber: string,
  adminUserId: string,
  toStatus: OrderStatus,
  input: AdminTransitionInput = {},
): Promise<Order> {
  const order = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .for("update")
      .limit(1);
    if (!current) throw new OrderNotFoundError();
    if (!canAdminTransition(current.status, toStatus)) {
      throw new InvalidOrderTransitionError(current.status, toStatus);
    }

    const trimmedTracking = input.trackingNumber?.trim() || null;
    const trimmedNote = input.note?.trim() || null;

    const [updated] = await tx
      .update(orders)
      .set({
        status: toStatus,
        updatedAt: new Date(),
        ...(toStatus === "shipped" && trimmedTracking ? { trackingNumber: trimmedTracking } : {}),
        ...(toStatus === "cancelled" ? { cancelReason: trimmedNote, cancelledAt: new Date() } : {}),
      })
      .where(eq(orders.id, current.id))
      .returning();
    if (!updated) throw new Error("Order status update returned no row");

    await tx.insert(orderStatusHistory).values({
      orderId: current.id,
      fromStatus: current.status,
      toStatus,
      actorRole: "admin",
      actorUserId: adminUserId,
      note: trimmedNote,
    });

    if (toStatus === "cancelled") {
      await restockCancelledOrderItems(tx, current.id);
    }

    return updated;
  });

  if (order.status === "cancelled") {
    await notifyEvent({ type: "order_cancelled", mobile: order.recipientMobile, orderNumber: order.orderNumber });
  } else {
    await notifyEvent({
      type: "order_status_changed",
      mobile: order.recipientMobile,
      orderNumber: order.orderNumber,
      status: order.status,
    });
  }
  return order;
}
