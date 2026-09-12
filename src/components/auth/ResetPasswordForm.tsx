"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ActionResult } from "@/domains/auth/actions";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initialState: ActionResult = undefined;

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      {state?.error ? (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      ) : null}

      <FormField
        label="رمز عبور جدید"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state?.fieldErrors?.password}
      />
      <FormField
        label="تکرار رمز عبور جدید"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state?.fieldErrors?.confirmPassword}
      />

      <SubmitButton pendingLabel="در حال ثبت...">تغییر رمز عبور</SubmitButton>
    </form>
  );
}
