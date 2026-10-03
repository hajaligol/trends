"use client";

import { useActionState, useRef } from "react";
import { resetPasswordAction, type ActionResult } from "@/domains/auth/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AuthAlert } from "@/components/auth/AuthShell";
import { NewPasswordFields } from "@/components/auth/NewPasswordFields";
import { useFocusOnError } from "@/components/auth/useFocusOnError";

const initialState: ActionResult = undefined;

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      {state?.error ? <AuthAlert tone="error">{state.error}</AuthAlert> : null}

      <NewPasswordFields
        passwordLabel="رمز عبور جدید"
        confirmLabel="تکرار رمز عبور جدید"
        passwordError={state?.fieldErrors?.password}
        confirmError={state?.fieldErrors?.confirmPassword}
      />

      <SubmitButton variant="brand" pendingLabel="در حال ثبت...">
        تغییر رمز عبور
      </SubmitButton>
    </form>
  );
}
