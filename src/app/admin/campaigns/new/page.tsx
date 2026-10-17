import { getCampaignPickerOptions } from "@/domains/campaigns/admin-queries";
import { CampaignForm } from "@/components/admin/campaign/CampaignForm";
import { PageHeader } from "@/components/admin/ui/layout";

export const metadata = { title: "کمپین جدید", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const { brands, categories } = await getCampaignPickerOptions();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="کمپین فروش جدید" backHref="/admin/campaigns" backLabel="کمپین‌ها" description="در چند مرحله کوتاه: نوع پیشنهاد، میزان تخفیف، محصولات مشمول و زمان‌بندی." />
      <CampaignForm campaign={null} brands={brands} categories={categories} />
    </div>
  );
}
