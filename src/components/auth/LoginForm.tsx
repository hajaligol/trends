"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type ActionResult } from "@/domains/auth/actions";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AuthAlert } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { useFocusOnError } from "@/components/auth/useFocusOnError";

const initialState: ActionResult = undefined;

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "success";
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      {justReset && !state ? (
        <AuthAlert tone="success">رمز عبور شما با موفقیت تغییر کرد. اکنون وارد شوید.</AuthAlert>
      ) : null}

      {state?.error ? <AuthAlert tone="error">{state.error}</AuthAlert> : null}

      <FormField
        label="شماره موبایل"
        name="mobile"
        type="tel"
        dir="ltr"
        inputMode="tel"
        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
        autoComplete="tel"
        autoFocus={!justReset}
        required
        defaultValue={state?.values?.mobile}
        error={state?.fieldErrors?.mobile}
      />
      <PasswordField
        label="رمز عبور"
        name="password"
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.password}
        labelAction={
          <Link
            href="/forgot-password"
            className="text-[0.8rem] text-text-secondary underline underline-offset-2 transition-colors hover:text-brand"
          >
            فراموش کرده‌اید؟
          </Link>
        }
      />

      <SubmitButton variant="brand" pendingLabel="در حال ورود...">
        ورود
      </SubmitButton>

      <p className="m-0 border-t border-line pt-5 text-center text-[0.88rem] text-text-secondary">
        هنوز حساب کاربری ندارید؟{" "}
        <Link href="/register" className="font-semibold text-brand underline underline-offset-2">
          ثبت‌نام کنید
        </Link>
      </p>
    </form>
  );
}
