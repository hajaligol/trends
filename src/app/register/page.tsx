import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getCurrentUser } from "@/domains/auth/actions";

export const metadata: Metadata = {
  title: "ثبت‌نام",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  return (
    <main className="py-[clamp(50px,8vw,90px)]">
      <Container className="mx-auto flex max-w-[420px] flex-col gap-6">
        <div className="text-center">
          <h1 className="m-0 text-[1.6rem] font-bold">ساخت حساب کاربری</h1>
          <p className="mt-2 text-[0.9rem] text-text-secondary">
            برای ثبت سفارش و پیگیری آن، یک حساب کاربری در ترندز بسازید.
          </p>
        </div>
        <RegisterForm />
      </Container>
    </main>
  );
}
