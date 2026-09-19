import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "قوانین و مقررات",
  description: "قوانین و مقررات استفاده از فروشگاه آنلاین ترندز.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <div className="mx-auto max-w-[860px]">
          <h1 className="mb-5 text-[clamp(1.4rem,3vw,1.9rem)] font-bold text-ink">قوانین و مقررات</h1>
          <div className="flex flex-col gap-4 text-[0.95rem] leading-8 text-ink/85">
            <p>
              با ثبت‌نام و استفاده از فروشگاه آنلاین ترندز، شما موافقت می‌کنید که اطلاعات وارد شده در فرم‌های
              ثبت‌نام، آدرس و سفارش صحیح باشد و مسئولیت صحت آن بر عهده شماست.
            </p>
            <p>
              قیمت و موجودی نهایی هر کالا در لحظه ثبت سفارش، از سمت سرور و بر اساس اطلاعات پایگاه‌داده محاسبه
              می‌شود و هیچ مقداری که مرورگر ارسال کند مبنای محاسبه قرار نمی‌گیرد.
            </p>
            <p>
              دیدگاه‌های ثبت‌شده برای محصولات پیش از انتشار توسط تیم ترندز بررسی می‌شوند و محتوای توهین‌آمیز،
              نامرتبط یا حاوی اطلاعات نادرست حذف یا رد خواهد شد.
            </p>
            <p className="text-[0.85rem] text-text-secondary">
              این متن یک راهنمای عمومی است و پیش از انتشار نهایی سایت باید توسط تیم حقوقی فروشگاه بازبینی و
              تکمیل شود.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
