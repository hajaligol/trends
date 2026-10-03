"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/domains/auth/actions";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AuthAlert } from "@/components/auth/AuthShell";
import { CheckIcon } from "@/components/ui/icons";
import { useFocusOnError } from "@/components/auth/useFocusOnError";

type FormState = {
  status: "idle" | "success";
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const initialState: FormState = { status: "idle" };

async function submitForgotPassword(_prevState: FormState, formData: FormData): Promise<FormState> {
  const result = await requestPasswordResetAction(undefined, formData);
  const mobile = formData.get("mobile");
  const values = typeof mobile === "string" ? { mobile: mobile.slice(0, 200) } : undefined;
  if (!result) return { status: "success" };
  return { status: "idle", ...result, values };
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(submitForgotPassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state.status === "idle" ? state : undefined);

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-4 rounded-[var(--radius-md)] bg-aqua/30 px-5 py-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-aqua text-ink">
          <CheckIcon width={24} height={24} />
        </span>
        <p className="m-0 text-[0.92rem] leading-relaxed text-ink">
          اگر این شماره موبایل در ترندز ثبت شده باشد، لینک بازیابی رمز عبور برایتان ارسال می‌شود.
        </p>
        <Link href="/login" className="text-[0.88rem] font-semibold text-brand underline underline-offset-2">
          بازگشت به ورود
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      {state.error ? <AuthAlert tone="error">{state.error}</AuthAlert> : null}

      <FormField
        label="شماره موبایل"
        name="mobile"
        type="tel"
        dir="ltr"
        inputMode="tel"
        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
        autoComplete="tel"
        autoFocus
        required
        defaultValue={state.values?.mobile}
        error={state.fieldErrors?.mobile}
      />

      <SubmitButton variant="brand" pendingLabel="در حال ارسال...">
        ارسال لینک بازیابی
      </SubmitButton>

      <p className="m-0 border-t border-line pt-5 text-center text-[0.88rem] text-text-secondary">
        <Link href="/login" className="font-semibold text-brand underline underline-offset-2">
          بازگشت به ورود
        </Link>
      </p>
    </form>
  );
}
