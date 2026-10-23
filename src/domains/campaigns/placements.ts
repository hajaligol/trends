import { and, desc, eq, gt, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { campaigns } from "@/lib/db/schema";
import { parseCampaignConfig } from "./config";
import { isValidHomeImagePath } from "./home-image";
import { describeDefinition } from "./labels";
import { campaignHref } from "./slug";

/** What the homepage needs to draw a campaign slide / banner card. */
export type HomeHeroSlideData = {
  id: string;
  alt: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  ctaHref: string;
};
export type HomePromoBannerData = {
  id: string;
  tone: "pink" | "blue";
  title: string;
  description: string;
  ctaLabel: string;
  imageUrl: string;
  ctaHref: string;
};

export const DEFAULT_CAMPAIGN_CTA_LABEL = "مشاهده محصولات";

/**
 * Campaigns that advertise themselves on the homepage RIGHT NOW: placement
 * chosen, campaign switched on and inside its time window, config valid (an
 * invalid campaign isn't applied to prices, so it must not be advertised
 * either). A scheduled/paused/ended campaign shows nothing, so the banner
 * can never promise a sale the cart won't honour. Newest campaign first.
 */
export async function getLiveHomePlacements(now: Date = new Date()): Promise<{
  hero: HomeHeroSlideData[];
  banners: HomePromoBannerData[];
}> {
  const rows = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.isActive, true),
        ne(campaigns.homePlacement, "none"),
        or(isNull(campaigns.startsAt), lte(campaigns.startsAt, now)),
        or(isNull(campaigns.endsAt), gt(campaigns.endsAt, now)),
      ),
    )
    .orderBy(desc(campaigns.createdAt));

  const hero: HomeHeroSlideData[] = [];
  const banners: HomePromoBannerData[] = [];
  for (const row of rows) {
    const parsed = parseCampaignConfig(row.kind, row.config);
    if (!parsed.ok || !row.homeImageUrl || !isValidHomeImagePath(row.homeImageUrl)) continue;
    const summary = describeDefinition(parsed.definition);
    const href = campaignHref(row.slug);
    if (row.homePlacement === "hero") {
      hero.push({
        id: `campaign-${row.id}`,
        alt: `${row.name} — ${summary}`,
        imageUrl: row.homeImageUrl,
        mobileImageUrl:
          row.homeMobileImageUrl && isValidHomeImagePath(row.homeMobileImageUrl) ? row.homeMobileImageUrl : null,
        ctaHref: href,
      });
    } else if (row.homePlacement === "banner") {
      banners.push({
        id: `campaign-${row.id}`,
        tone: row.homeBannerTone,
        title: row.homeTitle ?? row.name,
        description: row.homeDescription ?? row.description ?? summary,
        ctaLabel: row.homeCtaLabel ?? DEFAULT_CAMPAIGN_CTA_LABEL,
        imageUrl: row.homeImageUrl,
        ctaHref: href,
      });
    }
  }
  return { hero, banners };
}
