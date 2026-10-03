import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, AuthAlert } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { verifyPasswordResetToken } from "@/domains/auth/reset-tokens";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "تعیین رمز عبور جدید",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Verified again on actual submit inside `resetPasswordAction` — this
  // check is only so an already-expired/used link shows a clear message
  // instead of a confusing blank form.
  const verified = await verifyPasswordResetToken(token);

  return (
    <AuthShell
      title="تعیین رمز عبور جدید"
      subtitle={verified ? "یک رمز عبور جدید برای حساب خود انتخاب کنید." : "امکان استفاده از این لینک وجود ندارد."}
      panelHeading="یک رمز عبور تازه، یک شروع تازه"
    >
      {verified ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="flex flex-col gap-5">
          <AuthAlert tone="error">این لینک نامعتبر یا منقضی شده است.</AuthAlert>
          <ButtonLink href="/forgot-password" variant="brand" className="w-full">
            درخواست لینک جدید
          </ButtonLink>
          <p className="m-0 text-center text-[0.88rem] text-text-secondary">
            <Link href="/login" className="font-semibold text-brand underline underline-offset-2">
              بازگشت به ورود
            </Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
