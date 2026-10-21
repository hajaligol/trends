import Link from "next/link";
import { campaignHref } from "@/domains/campaigns/slug";
import type { CatalogCampaignInfo } from "@/domains/campaigns/pricing";

/**
 * Product page: the single best active campaign as a small tag linking to
 * the campaign's page. (The catalog query already reduces the list to the
 * campaign with the most benefit; only the first entry is rendered.)
 */
export function CampaignNotice({ campaigns }: { campaigns: CatalogCampaignInfo[] }) {
  const campaign = campaigns[0];
  if (!campaign) return null;
  return (
    <Link
      href={campaignHref(campaign.slug)}
      title={campaign.summary}
      className="inline-flex w-fit max-w-full items-center rounded-full bg-blush px-3.5 py-1.5 text-[0.82rem] leading-6 font-bold text-ink transition-colors hover:bg-pink"
    >
      <span className="truncate">{campaign.name}</span>
    </Link>
  );
}
