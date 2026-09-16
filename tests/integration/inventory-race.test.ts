import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, productVariants, products, users, carts, cartItems, orders } from "@/lib/db/schema";
import { createOrderFromCart, EmptyCartError, InsufficientStockError } from "@/domains/orders/queries";
import { createCart, addItemToCart } from "@/domains/cart/queries";
import { createTestCategory, createTestProductWithVariant, createTestUser } from "./helpers";
import type { ShippingMethod } from "@/domains/shipping/methods";

/**
 * Critical flow #7 ("insufficient stock") from
 * CLAUDE_BUILD_INSTRUCTIONS.txt Phase 14 — plus the concurrency
 * guarantee `createOrderFromCart`'s own header comment documents
 * (`WHERE stock >= quantity` conditional decrement, not read-then-write).
 *
 * This makes permanent the same kind of `Promise.allSettled` race test
 * Phase 8/9's sessions ran ad-hoc and threw away, per PROGRESS.md's
 * "Known Issues" list asking for exactly this.
 */

const shippingMethod: ShippingMethod = {
  code: "standard",
  label: "ارسال استاندارد",
  estimateLabel: "۳ تا ۵ روز کاری",
  feeToman: 0,
};

const shipping = {
  recipientName: "کاربر آزمایشی",
  recipientMobile: "+989123456789",
  province: "تهران",
  city: "تهران",
  addressLine: "خیابان آزمایشی، پلاک ۱",
  postalCode: "1234567890",
  plaqueUnitDetails: null,
  deliveryNotes: null,
};

const createdCategoryIds: string[] = [];
const createdProductIds: string[] = [];
const createdUserIds: string[] = [];
const createdCartIds: string[] = [];
const createdOrderIds: string[] = [];

afterAll(async () => {
  for (const orderId of createdOrderIds) await db.delete(orders).where(eq(orders.id, orderId));
  for (const cartId of createdCartIds) await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  for (const cartId of createdCartIds) await db.delete(carts).where(eq(carts.id, cartId));
  for (const userId of createdUserIds) await db.delete(users).where(eq(users.id, userId));
  for (const productId of createdProductIds) await db.delete(products).where(eq(products.id, productId));
  for (const categoryId of createdCategoryIds) await db.delete(categories).where(eq(categories.id, categoryId));
});

async function setUpCartWithStock(stock: number) {
  const category = await createTestCategory();
  createdCategoryIds.push(category.id);
  const { product, variant } = await createTestProductWithVariant(category.id, { stock, priceToman: 100_000 });
  createdProductIds.push(product.id);

  const user = await createTestUser();
  createdUserIds.push(user.id);
  const cart = await createCart(user.id);
  createdCartIds.push(cart.id);
  await addItemToCart(cart.id, variant.id, 1);

  return { variant, user, cart };
}

describe("createOrderFromCart — insufficient stock (critical flow #7)", () => {
  it("throws InsufficientStockError and does not create an order when stock drops to 0 after the item was added to the cart", async () => {
    // `addItemToCart` itself already refuses to add an out-of-stock
    // variant (`ProductUnavailableError`, tested in
    // `tests/integration/cart.test.ts`-shaped coverage elsewhere), so
    // the realistic way stock reaches 0 *after* a cart line exists is an
    // admin/another checkout depleting it in between add-to-cart and
    // this checkout attempt — simulated here the same way as the
    // "inactive variant" test below.
    const { variant, user, cart } = await setUpCartWithStock(1);
    await db.update(productVariants).set({ stock: 0 }).where(eq(productVariants.id, variant.id));

    await expect(createOrderFromCart(cart.id, user.id, shipping, shippingMethod, null)).rejects.toBeInstanceOf(
      InsufficientStockError,
    );

    const [variantAfter] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id)).limit(1);
    expect(variantAfter?.stock).toBe(0);
  });

  it("throws EmptyCartError for a cart with no items", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const cart = await createCart(user.id);
    createdCartIds.push(cart.id);

    await expect(createOrderFromCart(cart.id, user.id, shipping, shippingMethod, null)).rejects.toBeInstanceOf(
      EmptyCartError,
    );
  });

  it("throws InsufficientStockError when an inactive variant is in the cart", async () => {
    const category = await createTestCategory();
    createdCategoryIds.push(category.id);
    const { product, variant } = await createTestProductWithVariant(category.id, { stock: 10 });
    createdProductIds.push(product.id);
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const cart = await createCart(user.id);
    createdCartIds.push(cart.id);
    await addItemToCart(cart.id, variant.id, 1);

    // Deactivate the variant after it was added to the cart (simulates an
    // admin disabling a product between add-to-cart and checkout).
    await db.update(productVariants).set({ isActive: false }).where(eq(productVariants.id, variant.id));

    await expect(createOrderFromCart(cart.id, user.id, shipping, shippingMethod, null)).rejects.toBeInstanceOf(
      InsufficientStockError,
    );
  });
});

describe("createOrderFromCart — concurrency-safe stock decrement (never oversells)", () => {
  it("lets exactly one of two simultaneous checkouts succeed when only one unit is in stock", async () => {
    const { variant, user: userA, cart: cartA } = await setUpCartWithStock(1);

    const userB = await createTestUser();
    createdUserIds.push(userB.id);
    const cartB = await createCart(userB.id);
    createdCartIds.push(cartB.id);
    await addItemToCart(cartB.id, variant.id, 1);

    const results = await Promise.allSettled([
      createOrderFromCart(cartA.id, userA.id, shipping, shippingMethod, null),
      createOrderFromCart(cartB.id, userB.id, shipping, shippingMethod, null),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientStockError);

    if (fulfilled[0]?.status === "fulfilled") {
      createdOrderIds.push((fulfilled[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof createOrderFromCart>>>).value.id);
    }

    const [variantAfter] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id)).limit(1);
    expect(variantAfter?.stock).toBe(0);
  });

  it("under 5 simultaneous checkouts for 3 units, exactly 3 succeed and stock never goes negative", async () => {
    const { variant } = await setUpCartWithStock(3);
    // setUpCartWithStock already created one cart/user with 1 unit
    // reserved; add 4 more contenders for the remaining 3 units, so
    // there are 5 total attempts for only 3 units of stock.
    const contenders: { user: Awaited<ReturnType<typeof createTestUser>>; cart: Awaited<ReturnType<typeof createCart>> }[] = [];
    for (let i = 0; i < 4; i++) {
      const user = await createTestUser();
      createdUserIds.push(user.id);
      const cart = await createCart(user.id);
      createdCartIds.push(cart.id);
      await addItemToCart(cart.id, variant.id, 1);
      contenders.push({ user, cart });
    }

    const firstCartId = createdCartIds[createdCartIds.length - 5]!;
    const firstUserId = createdUserIds[createdUserIds.length - 5]!;

    const attempts = [
      createOrderFromCart(firstCartId, firstUserId, shipping, shippingMethod, null),
      ...contenders.map((c) => createOrderFromCart(c.cart.id, c.user.id, shipping, shippingMethod, null)),
    ];

    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter(
      (r) => r.status === "fulfilled",
    ) as PromiseFulfilledResult<Awaited<ReturnType<typeof createOrderFromCart>>>[];
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(3);
    expect(rejected).toHaveLength(2);
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientStockError);
    }
    for (const f of fulfilled) createdOrderIds.push(f.value.id);

    const [variantAfter] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id)).limit(1);
    expect(variantAfter?.stock).toBe(0);
  });
});
