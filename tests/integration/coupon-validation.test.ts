import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, type DbTransaction } from "@/lib/db/client";
import { categories, coupons, couponRedemptions, orders, users, products, carts, cartItems } from "@/lib/db/schema";
import { CouponInvalidError, validateCoupon, recordCouponRedemption } from "@/domains/promotions/queries";
import { createOrderFromCart } from "@/domains/orders/queries";
import { createCart, addItemToCart } from "@/domains/cart/queries";
import { createTestCategory, createTestCoupon, createTestProductWithVariant, createTestUser } from "./helpers";
import type { ShippingMethod } from "@/domains/shipping/methods";

/**
 * Critical flow #8 ("invalid coupon") from CLAUDE_BUILD_INSTRUCTIONS.txt
 * Phase 14, plus the usage-limit race `validateCoupon`'s header comment
 * documents (`FOR UPDATE` lock inside `createOrderFromCart`'s
 * transaction — "two simultaneous checkouts racing for the last
 * redemption ... serialize against each other instead of both
 * succeeding").
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
const createdCouponIds: string[] = [];

afterAll(async () => {
  for (const orderId of createdOrderIds) await db.delete(orders).where(eq(orders.id, orderId));
  for (const couponId of createdCouponIds) await db.delete(couponRedemptions).where(eq(couponRedemptions.couponId, couponId));
  for (const couponId of createdCouponIds) await db.delete(coupons).where(eq(coupons.id, couponId));
  for (const cartId of createdCartIds) await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  for (const cartId of createdCartIds) await db.delete(carts).where(eq(carts.id, cartId));
  for (const userId of createdUserIds) await db.delete(users).where(eq(users.id, userId));
  for (const productId of createdProductIds) await db.delete(products).where(eq(products.id, productId));
  for (const categoryId of createdCategoryIds) await db.delete(categories).where(eq(categories.id, categoryId));
});

describe("validateCoupon — basic validation rules", () => {
  it("rejects an unknown code", async () => {
    await expect(validateCoupon(db, "DOES-NOT-EXIST", "irrelevant-user-id", 1_000_000)).rejects.toBeInstanceOf(
      CouponInvalidError,
    );
  });

  it("rejects an inactive coupon", async () => {
    const coupon = await createTestCoupon({ isActive: false });
    createdCouponIds.push(coupon.id);
    const user = await createTestUser();
    createdUserIds.push(user.id);
    await expect(validateCoupon(db, coupon.code, user.id, 1_000_000)).rejects.toBeInstanceOf(CouponInvalidError);
  });

  it("rejects a coupon that hasn't started yet", async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const coupon = await createTestCoupon({ startsAt: future });
    createdCouponIds.push(coupon.id);
    const user = await createTestUser();
    createdUserIds.push(user.id);
    await expect(validateCoupon(db, coupon.code, user.id, 1_000_000)).rejects.toBeInstanceOf(CouponInvalidError);
  });

  it("rejects an expired coupon", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const coupon = await createTestCoupon({ endsAt: past });
    createdCouponIds.push(coupon.id);
    const user = await createTestUser();
    createdUserIds.push(user.id);
    await expect(validateCoupon(db, coupon.code, user.id, 1_000_000)).rejects.toBeInstanceOf(CouponInvalidError);
  });

  it("rejects a subtotal below the minimum basket", async () => {
    const coupon = await createTestCoupon({ minBasketToman: 2_000_000 });
    createdCouponIds.push(coupon.id);
    const user = await createTestUser();
    createdUserIds.push(user.id);
    await expect(validateCoupon(db, coupon.code, user.id, 1_000_000)).rejects.toBeInstanceOf(CouponInvalidError);
  });

  it("is case-insensitive on the code", async () => {
    const coupon = await createTestCoupon({ discountType: "fixed", discountValue: 50_000 });
    createdCouponIds.push(coupon.id);
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const result = await validateCoupon(db, coupon.code.toLowerCase(), user.id, 1_000_000);
    expect(result.discountToman).toBe(50_000);
  });

  it("caps the discount at the subtotal — never produces a negative order total", async () => {
    const coupon = await createTestCoupon({ discountType: "fixed", discountValue: 5_000_000 });
    createdCouponIds.push(coupon.id);
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const result = await validateCoupon(db, coupon.code, user.id, 1_000_000);
    expect(result.discountToman).toBe(1_000_000);
  });

  it("computes a percentage discount correctly, flooring fractional Toman", async () => {
    const coupon = await createTestCoupon({ discountType: "percentage", discountValue: 15 });
    createdCouponIds.push(coupon.id);
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const result = await validateCoupon(db, coupon.code, user.id, 333_333);
    // 333333 * 15 / 100 = 49999.95 -> floor -> 49999
    expect(result.discountToman).toBe(49_999);
  });

  it("rejects a customer who already redeemed past their per-customer limit", async () => {
    const coupon = await createTestCoupon({ perCustomerLimit: 1 });
    createdCouponIds.push(coupon.id);
    const user = await createTestUser();
    createdUserIds.push(user.id);

    // Simulate one prior redemption directly (no real order needed for
    // this unit of validation logic).
    const category = await createTestCategory();
    createdCategoryIds.push(category.id);
    const [fakeOrder] = await db
      .insert(orders)
      .values({
        orderNumber: `TR-TEST-${Date.now()}`,
        userId: user.id,
        status: "paid",
        recipientName: "x",
        recipientMobile: "+989123456789",
        province: "x",
        city: "x",
        addressLine: "x",
        postalCode: "1234567890",
        shippingMethodCode: "standard",
        shippingMethodLabel: "x",
        shippingEstimateLabel: "x",
        subtotalToman: 100_000,
        shippingFeeToman: 0,
        discountToman: 0,
        totalToman: 100_000,
      })
      .returning();
    createdOrderIds.push(fakeOrder!.id);
    await recordCouponRedemption(db as unknown as DbTransaction, coupon.id, user.id, fakeOrder!.id);

    await expect(validateCoupon(db, coupon.code, user.id, 1_000_000)).rejects.toBeInstanceOf(CouponInvalidError);
  });

  it("rejects once the total usage limit is reached, even for a different customer", async () => {
    const coupon = await createTestCoupon({ usageLimit: 1, perCustomerLimit: null });
    createdCouponIds.push(coupon.id);
    const userA = await createTestUser();
    createdUserIds.push(userA.id);
    const userB = await createTestUser();
    createdUserIds.push(userB.id);

    const [fakeOrder] = await db
      .insert(orders)
      .values({
        orderNumber: `TR-TEST-${Date.now()}`,
        userId: userA.id,
        status: "paid",
        recipientName: "x",
        recipientMobile: "+989123456789",
        province: "x",
        city: "x",
        addressLine: "x",
        postalCode: "1234567890",
        shippingMethodCode: "standard",
        shippingMethodLabel: "x",
        shippingEstimateLabel: "x",
        subtotalToman: 100_000,
        shippingFeeToman: 0,
        discountToman: 0,
        totalToman: 100_000,
      })
      .returning();
    createdOrderIds.push(fakeOrder!.id);
    await recordCouponRedemption(db as unknown as DbTransaction, coupon.id, userA.id, fakeOrder!.id);

    // userB never redeemed before, but the *total* usage limit is spent.
    await expect(validateCoupon(db, coupon.code, userB.id, 1_000_000)).rejects.toBeInstanceOf(CouponInvalidError);
  });
});

describe("coupon usage-limit race at checkout (usageLimit = 1, two simultaneous orders)", () => {
  it("lets exactly one of two simultaneous checkouts apply the coupon; the loser's order still succeeds without the discount rejected entirely", async () => {
    const category = await createTestCategory();
    createdCategoryIds.push(category.id);
    const { product, variant } = await createTestProductWithVariant(category.id, { stock: 10, priceToman: 200_000 });
    createdProductIds.push(product.id);

    const coupon = await createTestCoupon({ usageLimit: 1, perCustomerLimit: null, discountType: "fixed", discountValue: 50_000 });
    createdCouponIds.push(coupon.id);

    const userA = await createTestUser();
    createdUserIds.push(userA.id);
    const cartA = await createCart(userA.id);
    createdCartIds.push(cartA.id);
    await addItemToCart(cartA.id, variant.id, 1);

    const userB = await createTestUser();
    createdUserIds.push(userB.id);
    const cartB = await createCart(userB.id);
    createdCartIds.push(cartB.id);
    await addItemToCart(cartB.id, variant.id, 1);

    const results = await Promise.allSettled([
      createOrderFromCart(cartA.id, userA.id, shipping, shippingMethod, null, coupon.code),
      createOrderFromCart(cartB.id, userB.id, shipping, shippingMethod, null, coupon.code),
    ]);

    for (const r of results) if (r.status === "fulfilled") createdOrderIds.push(r.value.id);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Both checkouts had enough stock (10 units), so exactly one order
    // fails only because the coupon's single redemption was already
    // claimed by the other — never both succeeding with the discount
    // applied twice.
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(CouponInvalidError);

    const [redemptionCount] = await db
      .select({ id: couponRedemptions.id })
      .from(couponRedemptions)
      .where(eq(couponRedemptions.couponId, coupon.id));
    expect(redemptionCount).toBeDefined();
    const allRedemptions = await db.select().from(couponRedemptions).where(eq(couponRedemptions.couponId, coupon.id));
    expect(allRedemptions).toHaveLength(1);
  });
});
