import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
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
    <main className="py-[clamp(50px,8vw,90px)]">
      <Container className="mx-auto flex max-w-[420px] flex-col gap-6">
        <div className="text-center">
          <h1 className="m-0 text-[1.6rem] font-bold">ورود به حساب کاربری</h1>
          <p className="mt-2 text-[0.9rem] text-text-secondary">
            با شماره موبایل و رمز عبور خود وارد شوید.
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </Container>
    </main>
  );
}
