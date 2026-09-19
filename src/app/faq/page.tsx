import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "سوالات متداول",
  description: "پاسخ پرسش‌های رایج درباره خرید، ارسال، بازگشت کالا و پرداخت در ترندز.",
  alternates: { canonical: "/faq" },
};

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "چگونه می‌توانم سفارش خود را پیگیری کنم؟",
    answer:
      "پس از ثبت‌نام و ورود به حساب کاربری، از مسیر «سفارش‌های من» می‌توانید وضعیت هر سفارش و تاریخچه‌ی تغییر وضعیت آن را مشاهده کنید.",
  },
  {
    question: "روش‌های پرداخت کدام‌اند؟",
    answer:
      "در حال حاضر زیرساخت پرداخت آنلاین برای اتصال به درگاه بانکی آماده است، اما اتصال به یک درگاه واقعی هنوز پیکربندی نشده و به‌محض تکمیل، از همین صفحه اطلاع‌رسانی خواهد شد.",
  },
  {
    question: "چقدر طول می‌کشد تا سفارشم ارسال شود؟",
    answer: "زمان ارسال بسته به روش ارسال انتخابی در مرحله پرداخت مشخص می‌شود و در جزئیات سفارش شما قابل مشاهده است.",
  },
  {
    question: "آیا امکان لغو سفارش وجود دارد؟",
    answer:
      "بله، تا پیش از ارسال سفارش می‌توانید از صفحه جزئیات سفارش آن را لغو کنید. برای جزئیات بیشتر صفحه «بازگشت کالا» را ببینید.",
  },
  {
    question: "چطور می‌توانم برای یک محصول دیدگاه ثبت کنم؟",
    answer:
      "پس از خرید و تحویل موفق یک محصول، در صفحه همان محصول امکان ثبت امتیاز و دیدگاه برای شما فعال می‌شود. دیدگاه‌ها پیش از انتشار توسط تیم ترندز بررسی می‌شوند.",
  },
];

export default function FaqPage() {
  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <div className="mx-auto max-w-[860px]">
          <h1 className="mb-6 text-[clamp(1.4rem,3vw,1.9rem)] font-bold text-ink">سوالات متداول</h1>
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="rounded-[var(--radius-lg)] border border-line bg-white p-4">
                <summary className="cursor-pointer text-[0.95rem] font-medium text-ink">{item.question}</summary>
                <p className="mt-2 text-[0.88rem] leading-7 text-text-secondary">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </main>
  );
}
