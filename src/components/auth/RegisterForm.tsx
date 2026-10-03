"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { registerAction, type ActionResult } from "@/domains/auth/actions";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AuthAlert } from "@/components/auth/AuthShell";
import { NewPasswordFields } from "@/components/auth/NewPasswordFields";
import { useFocusOnError } from "@/components/auth/useFocusOnError";

const initialState: ActionResult = undefined;

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      {state?.error ? <AuthAlert tone="error">{state.error}</AuthAlert> : null}

      <FormField
        label="نام و نام خانوادگی"
        name="fullName"
        autoComplete="name"
        autoFocus
        required
        defaultValue={state?.values?.fullName}
        error={state?.fieldErrors?.fullName}
      />
      <FormField
        label="شماره موبایل"
        name="mobile"
        type="tel"
        dir="ltr"
        inputMode="tel"
        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
        autoComplete="tel"
        required
        hint="برای ورود به حساب و اطلاع‌رسانی سفارش از این شماره استفاده می‌شود."
        defaultValue={state?.values?.mobile}
        error={state?.fieldErrors?.mobile}
      />
      <FormField
        label="ایمیل (اختیاری)"
        name="email"
        type="email"
        dir="ltr"
        inputMode="email"
        placeholder="name@example.com"
        autoComplete="email"
        defaultValue={state?.values?.email}
        error={state?.fieldErrors?.email}
      />

      <NewPasswordFields
        passwordError={state?.fieldErrors?.password}
        confirmError={state?.fieldErrors?.confirmPassword}
      />

      <SubmitButton variant="brand" pendingLabel="در حال ساخت حساب...">
        ساخت حساب کاربری
      </SubmitButton>

      <p className="m-0 border-t border-line pt-5 text-center text-[0.88rem] text-text-secondary">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        <Link href="/login" className="font-semibold text-brand underline underline-offset-2">
          وارد شوید
        </Link>
      </p>
    </form>
  );
}
