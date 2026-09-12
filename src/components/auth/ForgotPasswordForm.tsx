"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/domains/auth/actions";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";

type FormState = { status: "idle" | "success"; error?: string; fieldErrors?: Record<string, string> };

const initialState: FormState = { status: "idle" };

async function submitForgotPassword(_prevState: FormState, formData: FormData): Promise<FormState> {
  const result = await requestPasswordResetAction(undefined, formData);
  if (!result) return { status: "success" };
  return { status: "idle", ...result };
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(submitForgotPassword, initialState);

  if (state.status === "success") {
    return (
      <div className="rounded-[var(--radius-md)] bg-aqua/40 px-5 py-4 text-center text-[0.9rem] text-ink">
        اگر این شماره موبایل در ترندز ثبت شده باشد، لینک بازیابی رمز عبور برایتان ارسال می‌شود.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      ) : null}

      <FormField
        label="شماره موبایل"
        name="mobile"
        type="tel"
        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
        autoComplete="tel"
        required
        error={state.fieldErrors?.mobile}
      />

      <SubmitButton pendingLabel="در حال ارسال...">ارسال لینک بازیابی</SubmitButton>

      <p className="text-center text-[0.85rem] text-text-secondary">
        <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
          بازگشت به ورود
        </Link>
      </p>
    </form>
  );
}
