import Link from "next/link";
import { campaignHref } from "@/domains/campaigns/slug";
import type { CatalogCampaignInfo } from "@/domains/campaigns/pricing";

/**
 * Product page: every active campaign covering the product, each as a small
 * tag linking to that campaign's page (name only; the offer summary is in
 * the tooltip).
 */
export function CampaignNotice({ campaigns }: { campaigns: CatalogCampaignInfo[] }) {
  if (campaigns.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="کمپین‌های فعال این محصول">
      {campaigns.map((campaign) => (
        <li key={campaign.id} className="max-w-full">
          <Link
            href={campaignHref(campaign.slug)}
            title={campaign.summary}
            className="inline-flex w-fit max-w-full items-center rounded-full bg-blush px-3.5 py-1.5 text-[0.82rem] leading-6 font-bold text-ink transition-colors hover:bg-pink"
          >
            <span className="truncate">{campaign.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
