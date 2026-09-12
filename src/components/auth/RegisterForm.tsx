"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type ActionResult } from "@/domains/auth/actions";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initialState: ActionResult = undefined;

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
          {state.error}
        </p>
      ) : null}

      <FormField
        label="نام و نام خانوادگی"
        name="fullName"
        autoComplete="name"
        required
        error={state?.fieldErrors?.fullName}
      />
      <FormField
        label="شماره موبایل"
        name="mobile"
        type="tel"
        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
        autoComplete="tel"
        required
        error={state?.fieldErrors?.mobile}
      />
      <FormField
        label="ایمیل (اختیاری)"
        name="email"
        type="email"
        autoComplete="email"
        error={state?.fieldErrors?.email}
      />
      <FormField
        label="رمز عبور"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state?.fieldErrors?.password}
      />
      <FormField
        label="تکرار رمز عبور"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state?.fieldErrors?.confirmPassword}
      />

      <SubmitButton pendingLabel="در حال ثبت‌نام...">ثبت‌نام</SubmitButton>

      <p className="text-center text-[0.85rem] text-text-secondary">
        حساب کاربری دارید؟{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
          وارد شوید
        </Link>
      </p>
    </form>
  );
}
