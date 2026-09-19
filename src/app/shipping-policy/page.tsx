import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { getSiteSettings } from "@/domains/admin/settings-queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "راهنمای ارسال",
  description: "روش‌ها، هزینه و شرایط ارسال سفارش در ترندز.",
  alternates: { canonical: "/shipping-policy" },
};

export default async function ShippingPolicyPage() {
  const settings = await getSiteSettings();

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <div className="mx-auto max-w-[860px]">
          <h1 className="mb-5 text-[clamp(1.4rem,3vw,1.9rem)] font-bold text-ink">راهنمای ارسال</h1>
          <div className="flex flex-col gap-4 text-[0.95rem] leading-8 text-ink/85">
            <p>
              سفارش‌های ترندز از طریق شرکت‌های پیک/پست همکار ارسال می‌شوند. در مرحله پرداخت، روش ارسال (عادی یا
              سریع) و هزینه دقیق آن بر اساس آدرس شما محاسبه و نمایش داده می‌شود.
            </p>
            <ul className="flex flex-col gap-2 ps-5">
              <li>هزینه ارسال عادی: {toPersianDigits(settings.standardShippingFeeToman)} تومان</li>
              <li>هزینه ارسال سریع: {toPersianDigits(settings.expressShippingFeeToman)} تومان</li>
              <li>
                ارسال رایگان برای سفارش‌های بالای {toPersianDigits(settings.freeShippingThresholdToman)} تومان
              </li>
            </ul>
            <p>
              پس از ثبت و پرداخت موفق سفارش، وضعیت آن (در حال پردازش، ارسال شده، تحویل شده) از صفحه «سفارش‌های
              من» و همراه با کد رهگیری (در صورت ثبت توسط تیم فروش) قابل پیگیری است.
            </p>
            <p className="text-[0.85rem] text-text-secondary">
              این متن یک راهنمای عمومی است و پیش از انتشار نهایی سایت باید توسط تیم عملیات/حقوقی فروشگاه
              بازبینی و تکمیل شود.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
