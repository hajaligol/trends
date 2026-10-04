import { getPaymentProviderStatus, getSiteSettings } from "@/domains/admin/settings-queries";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui/layout";
import { InfoIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "تنظیمات", robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  const [settings, paymentStatus] = await Promise.all([getSiteSettings(), Promise.resolve(getPaymentProviderStatus())]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="تنظیمات" description="اطلاعات فروشگاه، هزینه‌های ارسال و وضعیت درگاه پرداخت." />

      <SiteSettingsForm settings={settings} />

      <Card
        title="درگاه پرداخت"
        actions={
          <StatusBadge tone={paymentStatus.configured ? "success" : "warning"}>{paymentStatus.configured ? "پیکربندی‌شده" : "آزمایشی (mock)"}</StatusBadge>
        }
      >
        <p className="m-0 text-[0.88rem] leading-7 text-ink/85">
          {paymentStatus.configured
            ? `درگاه فعلی از طریق متغیر محیطی پیکربندی شده است: ${paymentStatus.provider}`
            : "هیچ درگاه پرداخت واقعی پیکربندی نشده است — سفارش‌ها با ارائه‌دهنده آزمایشی (mock) پردازش می‌شوند."}
        </p>
        <p className="m-0 mt-3 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-bg px-4 py-3 text-[0.8rem] leading-6 text-text-secondary">
          <InfoIcon width={18} height={18} className="mt-0.5 shrink-0" />
          تغییر درگاه پرداخت یا وارد کردن اطلاعات محرمانه از این صفحه ممکن نیست؛ این تنظیمات فقط از طریق متغیرهای محیطی سرور و استقرار مجدد قابل تغییر است.
        </p>
      </Card>
    </div>
  );
}
