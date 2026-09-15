"use client";

import { useActionState, useState } from "react";
import { subscribeNewsletterAction } from "@/domains/newsletter/actions";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

/** Wires the Footer's newsletter signup to `subscribeNewsletterAction` —
 * real persistence, replacing the presentational-only form from Phase 2
 * (see this file's former placement inline in `Footer.tsx`). */
export function NewsletterForm() {
  const [state, formAction] = useActionState(subscribeNewsletterAction, initialState);
  const [submitted, setSubmitted] = useState(false);

  if (submitted && state.ok) {
    return (
      <p className="min-w-[220px] rounded-full bg-sage/40 px-[18px] py-3 text-[0.85rem] text-ink">
        عضویت شما با موفقیت ثبت شد!
      </p>
    );
  }

  return (
    <form
      action={async (formData) => {
        setSubmitted(true);
        await formAction(formData);
      }}
      className="flex flex-wrap items-start gap-2.5"
      aria-label="فرم عضویت در خبرنامه"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="newsletterEmail" className="sr-only">
          ایمیل
        </label>
        <input
          type="email"
          id="newsletterEmail"
          name="email"
          placeholder="آدرس ایمیل شما"
          required
          dir="ltr"
          className="min-w-[220px] rounded-full border border-line bg-bg px-[18px] py-3 text-[0.88rem] focus:outline-2 focus:outline-ink focus:outline-offset-2"
        />
        {submitted && !state.ok && (
          <p role="alert" className="text-[0.75rem] text-red-700">
            {state.error}
          </p>
        )}
      </div>
      <button type="submit" className="rounded-full bg-ink px-[26px] py-3 text-[0.88rem] text-white">
        عضویت
      </button>
    </form>
  );
}
