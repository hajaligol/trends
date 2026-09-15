"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { submitReviewAction } from "@/domains/reviews/actions";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

/**
 * Renders only when the product page's server-side eligibility check
 * (`ReviewsSection`, via `hasUserPurchasedProduct`/
 * `getUserReviewForProduct`) already determined the signed-in customer
 * purchased this product and hasn't reviewed it yet — but the real
 * enforcement is `submitReviewAction` re-checking both server-side, not
 * this conditional render (same discipline as `CancelOrderButton`/
 * `AdminOrderStatusForm`).
 *
 * `submitted` (local state) rather than reading success off `state`
 * directly: `useActionState`'s state is `initialState` (`{ ok: true }`)
 * both before the first submit and after Next.js's internal identity
 * changes, so a plain `state.ok` check can't distinguish "never
 * submitted" from "submitted successfully" — the explicit flag can.
 */
export function ReviewForm({ productSlug }: { productSlug: string }) {
  const [state, formAction] = useActionState(submitReviewAction, initialState);
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  if (submitted && state.ok) {
    return (
      <p className="rounded-[var(--radius-md)] bg-sage/40 px-4 py-3 text-[0.85rem] text-ink">
        دیدگاه شما ثبت شد و پس از بررسی نمایش داده خواهد شد. سپاسگزاریم!
      </p>
    );
  }

  return (
    <form
      action={async (formData) => {
        setSubmitted(true);
        await formAction(formData);
      }}
      className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-white p-5"
    >
      <input type="hidden" name="productSlug" value={productSlug} />

      {submitted && !state.ok && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.85rem] text-ink">امتیاز شما</span>
        <div className="flex gap-1" dir="ltr">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} ستاره`}
              className={`text-[1.4rem] leading-none ${value <= rating ? "text-ink" : "text-line"}`}
            >
              ★
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.85rem] text-ink">عنوان (اختیاری)</span>
        <input
          name="title"
          maxLength={120}
          className="rounded-[var(--radius-md)] border border-line bg-white px-4 py-2.5 text-[0.9rem] outline-none focus:border-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.85rem] text-ink">متن دیدگاه</span>
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className="rounded-[var(--radius-md)] border border-line bg-white px-4 py-2.5 text-[0.9rem] outline-none focus:border-ink"
        />
      </label>

      <SubmitButton pendingLabel="در حال ثبت...">ثبت دیدگاه</SubmitButton>
    </form>
  );
}
