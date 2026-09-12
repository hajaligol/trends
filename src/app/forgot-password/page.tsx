import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "بازیابی رمز عبور",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="py-[clamp(50px,8vw,90px)]">
      <Container className="mx-auto flex max-w-[420px] flex-col gap-6">
        <div className="text-center">
          <h1 className="m-0 text-[1.6rem] font-bold">بازیابی رمز عبور</h1>
          <p className="mt-2 text-[0.9rem] text-text-secondary">
            شماره موبایل حساب خود را وارد کنید تا لینک بازیابی رمز عبور ارسال شود.
          </p>
        </div>
        <ForgotPasswordForm />
      </Container>
    </main>
  );
}
