"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import { reviewSchema } from "@/lib/validation/storefront";
import type { ActionResult } from "@/domains/auth/roles";
import { getProductDetailBySlug } from "@/domains/catalog/queries";
import { getUserReviewForProduct, hasUserPurchasedProduct } from "@/domains/reviews/queries";

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const flat = error.flatten();
  const firstField = Object.values(flat.fieldErrors).find((messages) => messages && messages.length > 0);
  return firstField?.[0] ?? "اطلاعات وارد شده معتبر نیست";
}

/**
 * Submits a review for a product, identified by its public `slug` (the
 * form never sends a raw database id — same "never trust a client-
 * supplied id without re-resolving it server-side" discipline as
 * `placeOrderAction` resolving the cart/address itself). Real
 * server-side checks, not just a hidden/disabled form state:
 *
 * 1. `auth()` — must be signed in; a review is always attributed to a
 *    real account, never an anonymous name typed into a form.
 * 2. `hasUserPurchasedProduct` — per this store's documented assumption
 *    (`lib/db/schema/reviews.ts`'s header comment), only a genuine
 *    purchaser may review a product. `isVerifiedPurchase` is set from
 *    this same check, not trusted from the client.
 * 3. `getUserReviewForProduct` — one review per customer per product;
 *    the database's own `uniqueIndex` (rule F.3) is the real guarantee,
 *    this is just a friendlier pre-check so a genuine race still fails
 *    safely via the caught unique-violation below rather than crashing.
 */
export async function submitReviewAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "برای ثبت دیدگاه ابتدا وارد حساب کاربری خود شوید" };

  const slug = String(formData.get("productSlug") ?? "");
  const product = slug ? await getProductDetailBySlug(slug) : null;
  if (!product) return { ok: false, error: "محصول یافت نشد" };

  const purchased = await hasUserPurchasedProduct(session.user.id, product.id);
  if (!purchased) {
    return { ok: false, error: "فقط خریداران این محصول می‌توانند برای آن دیدگاه ثبت کنند" };
  }

  const existing = await getUserReviewForProduct(session.user.id, product.id);
  if (existing) return { ok: false, error: "شما قبلاً برای این محصول دیدگاه ثبت کرده‌اید" };

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  try {
    await db.insert(reviews).values({
      productId: product.id,
      userId: session.user.id,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      isVerifiedPurchase: true,
    });
  } catch {
    // Lost a race against a second, near-simultaneous submission from
    // the same user/product — the unique index is the real guarantee
    // (see this function's header comment); report the same friendly
    // message the pre-check above would have given.
    return { ok: false, error: "شما قبلاً برای این محصول دیدگاه ثبت کرده‌اید" };
  }

  revalidatePath(`/product/${slug}`);
  return { ok: true };
}
