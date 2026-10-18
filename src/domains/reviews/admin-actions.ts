"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import { reviewModerationSchema, reviewReplySchema } from "@/lib/validation/admin";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";
import { notifyEvent } from "@/domains/notifications/provider";
import { getReviewForAdmin } from "@/domains/reviews/admin-queries";
import { revalidateProductPage } from "@/domains/catalog/revalidate";

/**
 * The only place a review's `status` is ever written after creation —
 * same single-writer discipline `orders/lifecycle.ts` established for
 * order status. Approving/rejecting a review that isn't currently
 * `pending` is still allowed (re-moderation, e.g. correcting a mistaken
 * rejection) rather than rejected as an "invalid transition" — unlike
 * order status, TRENDS_PROJECT_CONTEXT.md doesn't specify a review
 * moderation state machine beyond "moderation status", and re-moderation
 * is a normal, low-risk admin operation here, not a business-rule
 * violation the way e.g. re-marking a `delivered` order back to
 * `pending_payment` would be.
 */
export async function moderateReviewAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = reviewModerationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "اطلاعات وارد شده معتبر نیست" };

  const review = await getReviewForAdmin(parsed.data.reviewId);
  if (!review) return { ok: false, error: "دیدگاه یافت نشد" };

  await db
    .update(reviews)
    .set({
      status: parsed.data.status,
      moderationNote: parsed.data.moderationNote,
      moderatedByUserId: session.user.id,
      moderatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, parsed.data.reviewId));

  await recordAuditLog(session.user, `review.${parsed.data.status}`, "review", parsed.data.reviewId, {
    productTitle: review.productTitle,
    note: parsed.data.moderationNote,
  });

  await notifyEvent(
    parsed.data.status === "approved"
      ? { type: "review_approved", mobile: review.authorMobile, productTitle: review.productTitle }
      : {
          type: "review_rejected",
          mobile: review.authorMobile,
          productTitle: review.productTitle,
          note: parsed.data.moderationNote,
        },
  );

  revalidatePath("/admin/reviews");
  revalidateProductPage(review.productSlug);
  return { ok: true };
}

/**
 * Creates, edits or removes the store's public reply to a review (one
 * reply per review, stored on the review row). Same authorization +
 * server-side validation + audit discipline as `moderateReviewAction`:
 * the reviewer, product and "who replied" are all resolved server-side —
 * the form only sends the review id, the intent and the text.
 *
 * A reply is public, so it can only be written while the review is
 * `approved`; removing an existing reply is always allowed (e.g. after
 * a review is later rejected). The storefront additionally only renders
 * a reply under approved reviews (`getApprovedReviewsForProduct`).
 */
export async function replyToReviewAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = reviewReplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست" };

  const review = await getReviewForAdmin(parsed.data.reviewId);
  if (!review) return { ok: false, error: "دیدگاه یافت نشد" };

  if (parsed.data.intent === "delete") {
    if (!review.adminReply) return { ok: true };
    await db
      .update(reviews)
      .set({ adminReply: null, adminReplyAt: null, adminReplyByUserId: null, updatedAt: new Date() })
      .where(eq(reviews.id, review.id));
    await recordAuditLog(session.user, "review.reply_deleted", "review", review.id, { productTitle: review.productTitle });
  } else {
    if (review.status !== "approved") {
      return { ok: false, error: "فقط به دیدگاه‌های تأیید شده می‌توان پاسخ داد" };
    }
    const isEdit = Boolean(review.adminReply);
    await db
      .update(reviews)
      .set({
        adminReply: parsed.data.reply,
        adminReplyAt: new Date(),
        adminReplyByUserId: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, review.id));
    await recordAuditLog(session.user, isEdit ? "review.reply_edited" : "review.reply_created", "review", review.id, {
      productTitle: review.productTitle,
    });
  }

  revalidatePath("/admin/reviews");
  revalidateProductPage(review.productSlug);
  return { ok: true };
}
