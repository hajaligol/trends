"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import { reviewModerationSchema } from "@/lib/validation/admin";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";
import { notifyEvent } from "@/domains/notifications/provider";
import { getReviewForAdmin } from "@/domains/reviews/admin-queries";

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
  revalidatePath(`/product/${review.productSlug}`);
  return { ok: true };
}
