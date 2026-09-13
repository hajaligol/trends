import { and, count, eq } from "drizzle-orm";
import { db, type DbTransaction } from "@/lib/db/client";
import { coupons, couponRedemptions, type Coupon } from "@/lib/db/schema";

/**
 * The only sanctioned place for application code to read `coupons`/write
 * `coupon_redemptions` — same ownership/authority shape as
 * `cart/queries.ts`/`orders/queries.ts`: nothing outside this file ever
 * computes a discount amount, and every check that gates redemption
 * (active flag, date window, minimum basket, usage limits) runs
 * server-side against the database, never against anything the client
 * submitted.
 */

export class CouponInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponInvalidError";
  }
}

export type CouponValidationResult = {
  coupon: Coupon;
  discountToman: number;
};

/**
 * Validates `rawCode` against `subtotalToman` for `userId` and returns
 * the coupon row plus the discount amount it would produce — capped so
 * it can never exceed the subtotal (a coupon can make an order free, not
 * negative). Throws `CouponInvalidError` with a Persian, customer-facing
 * message for every failure case.
 *
 * Called two ways:
 * - As a checkout **preview** (`executor` = plain `db`, read-only) —
 *   `promotions/actions.ts`'s `previewCouponAction`, purely for UI
 *   feedback before the order is placed.
 * - **Authoritatively**, from inside `createOrderFromCart`'s transaction
 *   (`executor` = that transaction's `tx`) — the only call whose result
 *   actually gets applied to an order. There, `coupons` is locked with
 *   `FOR UPDATE` for the duration of the transaction, so two simultaneous
 *   checkouts racing for the last redemption of a `usageLimit`-capped
 *   coupon serialize against each other instead of both reading "capacity
 *   available" and both succeeding — the same "let the database provide
 *   the guarantee, not a check-then-write race" principle as
 *   `orders/queries.ts`'s conditional stock decrement.
 */
export async function validateCoupon(
  executor: typeof db | DbTransaction,
  rawCode: string,
  userId: string,
  subtotalToman: number,
): Promise<CouponValidationResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new CouponInvalidError("کد تخفیف را وارد کنید");

  const isTransaction = executor !== db;
  const rows = isTransaction
    ? await (executor as DbTransaction)
        .select()
        .from(coupons)
        .where(eq(coupons.code, code))
        .for("update")
        .limit(1)
    : await (executor as typeof db).select().from(coupons).where(eq(coupons.code, code)).limit(1);

  const coupon = rows[0];
  if (!coupon || !coupon.isActive) {
    throw new CouponInvalidError("کد تخفیف معتبر نیست");
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new CouponInvalidError("این کد تخفیف هنوز فعال نشده است");
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    throw new CouponInvalidError("این کد تخفیف منقضی شده است");
  }
  if (subtotalToman < coupon.minBasketToman) {
    throw new CouponInvalidError(
      `این کد تخفیف برای سبد خرید بالای ${coupon.minBasketToman.toLocaleString("en-US")} تومان قابل استفاده است`,
    );
  }

  if (coupon.usageLimit !== null) {
    const [totalRow] = await executor
      .select({ value: count() })
      .from(couponRedemptions)
      .where(eq(couponRedemptions.couponId, coupon.id));
    const totalRedemptions = totalRow?.value ?? 0;
    if (totalRedemptions >= coupon.usageLimit) {
      throw new CouponInvalidError("ظرفیت استفاده از این کد تخفیف تکمیل شده است");
    }
  }

  if (coupon.perCustomerLimit !== null) {
    const [userRow] = await executor
      .select({ value: count() })
      .from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, userId)));
    const userRedemptions = userRow?.value ?? 0;
    if (userRedemptions >= coupon.perCustomerLimit) {
      throw new CouponInvalidError("شما قبلاً از این کد تخفیف استفاده کرده‌اید");
    }
  }

  const rawDiscount =
    coupon.discountType === "percentage"
      ? Math.floor((subtotalToman * coupon.discountValue) / 100)
      : coupon.discountValue;
  const discountToman = Math.max(0, Math.min(rawDiscount, subtotalToman));

  return { coupon, discountToman };
}

/** Records a redemption. Called only from inside `createOrderFromCart`'s
 * transaction, right after the order row exists — never standalone,
 * since a redemption with no order behind it would be meaningless and
 * would falsely consume usage-limit capacity. */
export async function recordCouponRedemption(
  tx: DbTransaction,
  couponId: string,
  userId: string,
  orderId: string,
): Promise<void> {
  await tx.insert(couponRedemptions).values({ couponId, userId, orderId });
}
