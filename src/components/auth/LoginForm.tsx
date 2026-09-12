"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type ActionResult } from "@/domains/auth/actions";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initialState: ActionResult = undefined;

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "success";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {justReset ? (
        <p className="rounded-[var(--radius-sm)] bg-aqua/40 px-4 py-2.5 text-[0.85rem] text-ink">
          رمز عبور شما با موفقیت تغییر کرد. اکنون وارد شوید.
        </p>
      ) : null}

      {state?.error ? (
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
        error={state?.fieldErrors?.mobile}
      />
      <FormField
        label="رمز عبور"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.password}
      />

      <div className="text-left">
        <Link href="/forgot-password" className="text-[0.82rem] text-text-secondary underline underline-offset-2">
          رمز عبور را فراموش کرده‌اید؟
        </Link>
      </div>

      <SubmitButton pendingLabel="در حال ورود...">ورود</SubmitButton>

      <p className="text-center text-[0.85rem] text-text-secondary">
        حساب کاربری ندارید؟{" "}
        <Link href="/register" className="font-semibold text-ink underline underline-offset-2">
          ثبت‌نام کنید
        </Link>
      </p>
    </form>
  );
}
