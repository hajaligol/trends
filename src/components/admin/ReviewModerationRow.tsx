"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { moderateReviewAction } from "@/domains/reviews/admin-actions";
import type { AdminReviewRow } from "@/domains/reviews/admin-queries";
import type { ActionResult } from "@/domains/auth/roles";
import { toPersianDigits } from "@/lib/utils/persian-digits";

const STATUS_LABELS: Record<AdminReviewRow["status"], string> = {
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
};

const initialState: ActionResult = { ok: true };

/** One review's full content + its approve/reject moderation form — per
 * `moderateReviewAction`'s own header comment, moderating an
 * already-moderated review (re-approving/re-rejecting) is allowed, so
 * this form always renders both actions regardless of current status,
 * not just for `pending` rows. */
export function ReviewModerationRow({ review }: { review: AdminReviewRow }) {
  const [state, formAction] = useActionState(moderateReviewAction, initialState);
  const [note, setNote] = useState(review.moderationNote ?? "");
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[0.8rem] text-text-secondary">
            {review.productTitle} — {review.authorName ?? review.authorMobile}
            {review.isVerifiedPurchase && (
              <span className="ms-2 rounded-full bg-sage px-2 py-0.5 text-[0.72rem] text-ink">خرید تأیید شده</span>
            )}
          </p>
          <p className="mt-1 text-[0.95rem] font-bold text-ink">
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
            <span className="ms-2 text-[0.8rem] font-normal text-text-secondary">
              ({toPersianDigits(review.rating)} از ۵)
            </span>
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[0.75rem] ${
            review.status === "approved" ? "bg-sage text-ink" : review.status === "rejected" ? "bg-blush text-ink" : "bg-header text-text-secondary"
          }`}
        >
          {STATUS_LABELS[review.status]}
        </span>
      </div>

      {review.title && <p className="font-medium text-ink">{review.title}</p>}
      <p className="text-[0.88rem] leading-7 text-ink/85">{review.body}</p>

      <form
        action={async (formData) => {
          await formAction(formData);
          router.refresh();
        }}
        className="flex flex-wrap items-end gap-3 border-t border-line pt-3"
      >
        <input type="hidden" name="reviewId" value={review.id} />
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[0.78rem] text-text-secondary">یادداشت مدیریتی (اختیاری، در صورت رد نمایش داده می‌شود)</span>
          <textarea
            name="moderationNote"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={1}
            className="rounded-[var(--radius-sm)] border border-line px-3 py-2 text-[0.82rem] outline-none focus:border-ink"
          />
        </label>
        <button
          type="submit"
          name="status"
          value="approved"
          className="rounded-full bg-ink px-4 py-2 text-[0.8rem] text-white hover:opacity-88"
        >
          تأیید
        </button>
        <button
          type="submit"
          name="status"
          value="rejected"
          className="rounded-full bg-header px-4 py-2 text-[0.8rem] text-ink hover:opacity-80"
        >
          رد
        </button>
      </form>
      {!state.ok && <p className="text-[0.78rem] text-red-700">{state.error}</p>}
    </div>
  );
}
