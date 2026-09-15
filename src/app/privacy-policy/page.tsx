import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "حریم خصوصی",
  description: "نحوه جمع‌آوری، استفاده و نگهداری اطلاعات شخصی مشتریان در ترندز.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <div className="mx-auto max-w-[760px]">
          <h1 className="mb-5 text-[clamp(1.4rem,3vw,1.9rem)] font-bold text-ink">حریم خصوصی</h1>
          <div className="flex flex-col gap-4 text-[0.95rem] leading-8 text-ink/85">
            <p>
              ترندز اطلاعاتی مانند نام، شماره موبایل، آدرس و تاریخچه سفارش شما را صرفاً برای پردازش سفارش،
              اطلاع‌رسانی وضعیت آن و بهبود خدمات فروشگاه استفاده می‌کند.
            </p>
            <p>
              رمز عبور حساب کاربری شما به‌صورت هش‌شده و غیرقابل بازیابی ذخیره می‌شود و اطلاعات کارت بانکی هرگز
              در سرورهای ترندز نگهداری نمی‌شود؛ پرداخت از طریق درگاه بانکی معتبر انجام می‌گیرد.
            </p>
            <p>
              در صورت عضویت در خبرنامه، ایمیل شما فقط برای ارسال اطلاعیه‌های تخفیف و محصولات جدید استفاده
              می‌شود و در هر زمان می‌توانید درخواست لغو اشتراک دهید.
            </p>
            <p className="text-[0.85rem] text-text-secondary">
              این متن یک راهنمای عمومی است و پیش از انتشار نهایی سایت باید توسط تیم حقوقی فروشگاه بازبینی و
              مطابق با قوانین حفاظت از داده‌ی قابل‌اجرا تکمیل شود.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
