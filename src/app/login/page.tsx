import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/domains/auth/actions";

export const metadata: Metadata = {
  title: "ورود",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  return (
    <AuthShell
      title="ورود به حساب کاربری"
      subtitle="با شماره موبایل و رمز عبور خود وارد شوید."
      panelHeading="خوش برگشتید؛ ادامه خرید از همین‌جا"
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
