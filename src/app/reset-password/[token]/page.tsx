import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { verifyPasswordResetToken } from "@/domains/auth/reset-tokens";

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
    <main className="py-[clamp(50px,8vw,90px)]">
      <Container className="mx-auto flex max-w-[420px] flex-col gap-6">
        <div className="text-center">
          <h1 className="m-0 text-[1.6rem] font-bold">تعیین رمز عبور جدید</h1>
        </div>

        {verified ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="rounded-[var(--radius-sm)] bg-red-50 px-4 py-2.5 text-[0.85rem] text-red-700">
              این لینک نامعتبر یا منقضی شده است.
            </p>
            <Link href="/forgot-password" className="font-semibold text-ink underline underline-offset-2">
              درخواست لینک جدید
            </Link>
          </div>
        )}
      </Container>
    </main>
  );
}
