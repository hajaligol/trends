import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ContactForm } from "@/components/support/ContactForm";
import { getSiteSettings } from "@/domains/admin/settings-queries";

export const metadata: Metadata = {
  title: "تماس با ما",
  description: "برای پرسش، پیگیری سفارش یا پیشنهاد با تیم پشتیبانی ترندز در ارتباط باشید.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <div className="mx-auto grid max-w-[1000px] gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-4">
            <h1 className="text-[clamp(1.4rem,3vw,1.9rem)] font-bold text-ink">تماس با ما</h1>
            <p className="text-[0.9rem] leading-7 text-text-secondary">
              پرسش، پیشنهاد یا مشکلی دارید؟ فرم روبه‌رو را پر کنید تا تیم پشتیبانی ترندز در اسرع وقت پاسخگو باشد.
            </p>
            {(settings.supportEmail || settings.supportPhone) && (
              <div className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-line bg-white p-4 text-[0.85rem] text-ink">
                {settings.supportEmail && (
                  <p dir="ltr" className="text-end">
                    {settings.supportEmail}
                  </p>
                )}
                {settings.supportPhone && (
                  <p dir="ltr" className="text-end">
                    {settings.supportPhone}
                  </p>
                )}
              </div>
            )}
          </div>

          <ContactForm />
        </div>
      </Container>
    </main>
  );
}
