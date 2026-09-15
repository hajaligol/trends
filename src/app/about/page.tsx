import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "درباره ما",
  description: "درباره ترندز؛ فروشگاه آنلاین پوشاک و اکسسوری.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <div className="mx-auto max-w-[760px]">
          <h1 className="mb-5 text-[clamp(1.4rem,3vw,1.9rem)] font-bold text-ink">درباره ترندز</h1>
          <div className="flex flex-col gap-4 text-[0.95rem] leading-8 text-ink/85">
            <p>
              ترندز یک فروشگاه آنلاین پوشاک و اکسسوری است که با هدف ارائه‌ی تجربه‌ای ساده، سریع و قابل‌اعتماد از
              خرید آنلاین برای مشتریان ایرانی راه‌اندازی شده است. تمرکز ما بر انتخاب محصولاتی با کیفیت مناسب،
              قیمت منصفانه و ارسال به‌موقع است.
            </p>
            <p>
              از انتخاب محصول تا تحویل درب منزل، تلاش می‌کنیم هر مرحله شفاف و قابل پیگیری باشد؛ از جمله وضعیت
              سفارش، موجودی انبار و روند ارسال.
            </p>
            <p>
              برای هرگونه پرسش یا پیشنهاد، از طریق{" "}
              <a href="/contact" className="underline underline-offset-2">
                صفحه تماس با ما
              </a>{" "}
              با تیم پشتیبانی در ارتباط باشید.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
