"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { submitSupportMessageAction } from "@/domains/support/actions";
import type { ActionResult } from "@/domains/auth/roles";

const initialState: ActionResult = { ok: true };

export function ContactForm() {
  const [state, formAction] = useActionState(submitSupportMessageAction, initialState);
  const [submitted, setSubmitted] = useState(false);

  if (submitted && state.ok) {
    return (
      <p className="rounded-[var(--radius-md)] bg-sage/40 px-4 py-4 text-[0.9rem] text-ink">
        پیام شما ثبت شد. تیم پشتیبانی ترندز در اسرع وقت با شما تماس خواهد گرفت.
      </p>
    );
  }

  return (
    <form
      action={async (formData) => {
        setSubmitted(true);
        await formAction(formData);
      }}
      className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-white p-6"
    >
      {submitted && !state.ok && (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      )}

      <FormField label="نام و نام خانوادگی" name="name" required />
      <FormField label="ایمیل" name="email" type="email" required />
      <FormField label="شماره موبایل (اختیاری)" name="mobile" />
      <FormField label="موضوع" name="subject" required />

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.85rem] text-ink">متن پیام</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          className="rounded-[var(--radius-md)] border border-line bg-white px-4 py-2.5 text-[0.9rem] outline-none focus:border-ink"
        />
      </label>

      <SubmitButton pendingLabel="در حال ارسال...">ارسال پیام</SubmitButton>
    </form>
  );
}
