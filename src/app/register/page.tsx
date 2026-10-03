import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
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
    <AuthShell
      title="ساخت حساب کاربری"
      subtitle="برای ثبت سفارش و پیگیری آن، یک حساب کاربری در ترندز بسازید."
      panelHeading="به ترندز بپیوندید و خریدتان را ساده‌تر کنید"
    >
      <RegisterForm />
    </AuthShell>
  );
}
