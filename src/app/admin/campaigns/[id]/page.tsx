import { notFound } from "next/navigation";
import { getCampaignForAdmin, getCampaignPickerOptions } from "@/domains/campaigns/admin-queries";
import { campaignStatus, STATUS_LABEL } from "@/domains/campaigns/status";
import { CampaignForm } from "@/components/admin/campaign/CampaignForm";
import { PageHeader, StatusBadge } from "@/components/admin/ui/layout";

export const metadata = { title: "ویرایش کمپین", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [campaign, options] = await Promise.all([getCampaignForAdmin(id), getCampaignPickerOptions()]);
  if (!campaign) notFound();
  const status = campaignStatus(campaign.row);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={campaign.row.name}
        backHref="/admin/campaigns"
        backLabel="کمپین‌ها"
        badge={<StatusBadge tone={status === "live" ? "success" : status === "scheduled" ? "info" : status === "paused" ? "warning" : "neutral"}>{STATUS_LABEL[status]}</StatusBadge>}
      />
      {!campaign.definition && (
        <p role="alert" className="m-0 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-[0.86rem] text-red-800">
          تنظیمات ذخیره‌شده این کمپین معتبر نیست و در فروشگاه اعمال نمی‌شود. تنظیمات را دوباره وارد و ذخیره کنید.
        </p>
      )}
      <CampaignForm campaign={campaign} brands={options.brands} categories={options.categories} />
    </div>
  );
}
