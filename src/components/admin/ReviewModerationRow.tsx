"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { moderateReviewAction } from "@/domains/reviews/admin-actions";
import type { AdminReviewRow } from "@/domains/reviews/admin-queries";
import type { ActionResult } from "@/domains/auth/roles";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { adminButton, Avatar, formatDate, StatusBadge } from "@/components/admin/ui/layout";
import { FormAlert, Spinner, TextareaField, useAdminAction } from "@/components/admin/ui/form";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { RatingStarIcon } from "@/components/ui/icons";
import Link from "next/link";

const STATUS_LABELS: Record<AdminReviewRow["status"], string> = {
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
};
const STATUS_TONES = { pending: "warning", approved: "success", rejected: "danger" } as const;

const initialState: ActionResult = { ok: true };

function DecisionButton({ value, tone, children }: { value: "approved" | "rejected"; tone: "primary" | "secondary"; children: React.ReactNode }) {
  const { pending, data } = useFormStatus();
  const isThis = pending && data?.get("status") === value;
  return (
    <button type="submit" name="status" value={value} disabled={pending} className={adminButton(tone, "sm")}>
      {isThis && <Spinner />}
      {children}
    </button>
  );
}

/** One review's full content + its approve/reject moderation form — per
 * `moderateReviewAction`'s own header comment, moderating an
 * already-moderated review (re-approving/re-rejecting) is allowed, so
 * this form always renders both actions regardless of current status,
 * not just for `pending` rows. */
export function ReviewModerationRow({ review }: { review: AdminReviewRow }) {
  const router = useRouter();
  const [state, formAction] = useAdminAction(moderateReviewAction, initialState, {
    successMessage: "وضعیت دیدگاه به‌روزرسانی شد",
    onSuccess: () => router.refresh(),
  });
  const [note, setNote] = useState(review.moderationNote ?? "");

  return (
    <article className={`flex flex-col gap-4 rounded-[var(--radius-lg)] border bg-white p-5 sm:p-6 ${review.status === "pending" ? "border-yellow" : "border-line"}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={review.authorName ?? review.authorMobile} />
          <div className="flex flex-col leading-tight">
            <span className="text-[0.9rem] font-semibold text-ink">{review.authorName ?? "بدون نام"}</span>
            <span className="text-[0.76rem] text-text-secondary">
              {formatDate(review.createdAt)}
              {review.isVerifiedPurchase && <span className="ms-2 rounded-full bg-sage/60 px-2 py-0.5 text-[0.7rem] text-ink">خرید تأیید شده</span>}
            </span>
          </div>
        </div>
        <StatusBadge tone={STATUS_TONES[review.status]}>{STATUS_LABELS[review.status]}</StatusBadge>
      </header>

      <div className="flex flex-col gap-2">
        <Link href={`/product/${review.productSlug}`} target="_blank" className="w-fit text-[0.8rem] text-brand hover:underline">
          {review.productTitle}
        </Link>
        <div className="flex items-center gap-2" role="img" aria-label={`امتیاز ${toPersianDigits(review.rating)} از ۵`}>
          <span className="flex gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <RatingStarIcon key={n} filled={n <= review.rating} width={18} height={18} />
            ))}
          </span>
        </div>
        {review.title && <p className="m-0 text-[0.95rem] font-bold text-ink">{review.title}</p>}
        <p className="m-0 text-[0.9rem] leading-7 whitespace-pre-line text-ink/85">{review.body}</p>
      </div>

      <form action={formAction} className="flex flex-col gap-3 border-t border-line pt-4">
        <input type="hidden" name="reviewId" value={review.id} />
        <FormAlert state={state} />
        <TextareaField
          label="یادداشت مدیریتی"
          name="moderationNote"
          optional
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          hint="در صورت رد دیدگاه، این یادداشت به نویسنده نمایش داده می‌شود."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <DecisionButton value="approved" tone="primary">
            <CheckIcon width={16} height={16} />
            تأیید و انتشار
          </DecisionButton>
          <DecisionButton value="rejected" tone="secondary">
            <XIcon width={16} height={16} />
            رد دیدگاه
          </DecisionButton>
        </div>
      </form>
    </article>
  );
}
