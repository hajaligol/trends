import { bestCampaignForProduct, bestPriceCampaign, campaignCoversProduct, type EngineCampaign, type ProductRef } from "./engine";
import { isPriceLevelKind } from "./config";
import { describeDefinition } from "./labels";
import { getActiveCampaignsForRequest } from "./queries";
import type { CampaignKind } from "@/lib/db/schema/campaigns";

/**
 * Catalog-facing view of campaigns: turns the live campaigns into the
 * numbers the storefront displays. DISPLAY ONLY — the cart and the order
 * recompute everything with `evaluateCart` on their own.
 */

export type CatalogCampaignInfo = {
  id: string;
  name: string;
  /** Public products page of the campaign: `/sale/<slug>`. */
  slug: string;
  kind: CampaignKind;
  /** Short Persian description of the offer, e.g. «۲ بخر، ۱ رایگان بگیر». */
  summary: string;
  description: string | null;
  /** Price-level campaigns change the displayed price; the rest are shown as notes. */
  changesPrice: boolean;
  /** ISO end time, only when the operator asked for a countdown. */
  countdownEndsAt: string | null;
};

export type CatalogPricing = { campaigns: readonly EngineCampaign[] };

export async function getCatalogPricing(): Promise<CatalogPricing> {
  return { campaigns: await getActiveCampaignsForRequest() };
}

export const NO_CAMPAIGNS: CatalogPricing = { campaigns: [] };

/**
 * The price a customer sees for one variant. When a price-level campaign
 * applies, the regular price becomes the struck-through "compare at" price.
 */
export function priceVariantForCatalog(
  pricing: CatalogPricing,
  ref: ProductRef,
  variant: { priceToman: number; compareAtPriceToman: number | null },
): { priceToman: number; compareAtPriceToman: number | null } {
  const best = bestPriceCampaign(pricing.campaigns, ref, variant.priceToman);
  if (!best) return { priceToman: variant.priceToman, compareAtPriceToman: variant.compareAtPriceToman };
  return { priceToman: best.priceToman, compareAtPriceToman: variant.priceToman };
}

function toCampaignInfo(campaign: EngineCampaign): CatalogCampaignInfo {
  return {
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    kind: campaign.kind,
    summary: describeDefinition(campaign),
    description: campaign.description,
    changesPrice: isPriceLevelKind(campaign.kind),
    countdownEndsAt: campaign.showCountdown && campaign.endsAt ? campaign.endsAt.toISOString() : null,
  };
}

/** Live campaigns covering a product, best-known first (price-level first). */
export function campaignInfosFor(pricing: CatalogPricing, ref: ProductRef): CatalogCampaignInfo[] {
  return pricing.campaigns
    .filter((campaign) => campaignCoversProduct(campaign.scope, ref))
    .map(toCampaignInfo)
    .sort((a, b) => Number(b.changesPrice) - Number(a.changesPrice));
}

/**
 * Product page: only the ONE campaign that saves the customer the most
 * (judged on `referencePriceToman`, the product's regular starting price).
 * Returns an array so callers keep the `campaigns` shape; it holds 0 or 1.
 */
export function bestCampaignInfoFor(
  pricing: CatalogPricing,
  ref: ProductRef,
  referencePriceToman: number,
): CatalogCampaignInfo[] {
  const best = bestCampaignForProduct(pricing.campaigns, ref, referencePriceToman);
  return best ? [toCampaignInfo(best)] : [];
}
