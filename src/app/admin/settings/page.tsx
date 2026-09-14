import { getPaymentProviderStatus, getSiteSettings } from "@/domains/admin/settings-queries";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";

export const metadata = { title: "تنظیمات", robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  const [settings, paymentStatus] = await Promise.all([getSiteSettings(), Promise.resolve(getPaymentProviderStatus())]);

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-[1.15rem] font-bold text-ink">تنظیمات فروشگاه و ارسال</h1>
        <SiteSettingsForm settings={settings} />
      </section>

      <section className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <h2 className="text-[1rem] font-bold text-ink">وضعیت درگاه پرداخت</h2>
        <p className="text-[0.85rem] text-text-secondary">
          {paymentStatus.configured
            ? `درگاه فعلی از طریق متغیر محیطی پیکربندی شده است: ${paymentStatus.provider}`
            : "هیچ درگاه پرداخت واقعی پیکربندی نشده است — سفارش‌ها با ارائه‌دهنده آزمایشی (mock) پردازش می‌شوند."}
        </p>
        <p className="text-[0.78rem] text-text-secondary">
          تغییر درگاه پرداخت یا وارد کردن اطلاعات محرمانه از این صفحه ممکن نیست؛ این تنظیمات فقط از طریق متغیرهای محیطی
          سرور و استقرار مجدد قابل تغییر است.
        </p>
      </section>
    </div>
  );
}
