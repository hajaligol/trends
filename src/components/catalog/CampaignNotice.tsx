import type { CatalogCampaignInfo } from "@/domains/campaigns/pricing";
import { CampaignCountdown } from "@/components/catalog/CampaignCountdown";

/** Active campaigns covering this product, on the product page. */
export function CampaignNotice({ campaigns }: { campaigns: CatalogCampaignInfo[] }) {
  if (campaigns.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="کمپین‌های فعال این محصول">
      {campaigns.map((campaign) => (
        <li key={campaign.id} className="flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-blush/60 px-4 py-3 text-[0.88rem] leading-6">
          <span className="font-bold text-ink">{campaign.name}</span>
          <span className="text-ink">{campaign.summary}</span>
          {campaign.description && <span className="text-[0.8rem] text-text-secondary">{campaign.description}</span>}
          {campaign.countdownEndsAt && (
            <span className="mt-1 text-[0.8rem] text-text-secondary">
              زمان باقی‌مانده: <CampaignCountdown endsAt={campaign.countdownEndsAt} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
