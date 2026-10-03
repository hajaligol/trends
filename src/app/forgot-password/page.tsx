import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "بازیابی رمز عبور",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="بازیابی رمز عبور"
      subtitle="شماره موبایل حساب خود را وارد کنید تا لینک بازیابی رمز عبور ارسال شود."
      panelHeading="رمز عبور را فراموش کرده‌اید؟ نگران نباشید"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
