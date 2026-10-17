import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { campaignTargets, campaigns, categories, products } from "@/lib/db/schema";
import { getProductSummariesByIds, type CatalogProductSummary } from "@/domains/catalog/queries";
import { campaignCoversProduct } from "./engine";
import { describeDefinition } from "./labels";
import { toEngineCampaign } from "./queries";
import { campaignStatus } from "./status";

export const CAMPAIGN_PAGE_SIZE = 12;

export type CampaignLanding =
  | {
      state: "live";
      name: string;
      slug: string;
      description: string | null;
      summary: string;
      countdownEndsAt: string | null;
      products: CatalogProductSummary[];
      total: number;
      page: number;
      totalPages: number;
    }
  | { state: "ended"; name: string };

/**
 * Data for `/sale/<slug>`. Returns `null` (→ 404) unless the campaign is live
 * or has simply ended: a paused or not-yet-started campaign must not leak its
 * name or products. Products are every ACTIVE product the campaign's scope
 * covers, newest first, paginated in application code (the same documented
 * tradeoff as the category/collection pages at this catalog size).
 */
export async function getCampaignLanding(slug: string, requestedPage: number, now: Date = new Date(), pageSpan = 1): Promise<CampaignLanding | null> {
  const [row] = await db.select().from(campaigns).where(eq(campaigns.slug, slug)).limit(1);
  if (!row) return null;

  const status = campaignStatus(row, now);
  if (status === "ended") return { state: "ended", name: row.name };
  if (status !== "live") return null;

  const [targets, categoryRows] = await Promise.all([
    db.select().from(campaignTargets).where(eq(campaignTargets.campaignId, row.id)),
    db.select({ id: categories.id, parentId: categories.parentId }).from(categories),
  ]);
  const campaign = toEngineCampaign(row, targets, categoryRows);
  if (!campaign) return null; // invalid config: the campaign isn't applied, so don't present it

  const active = await db
    .select({ id: products.id, brandId: products.brandId, categoryId: products.categoryId })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(desc(products.createdAt), asc(products.id));
  const coveredIds = active
    .filter((p) => campaignCoversProduct(campaign.scope, { productId: p.id, brandId: p.brandId, categoryId: p.categoryId }))
    .map((p) => p.id);

  const total = coveredIds.length;
  const totalPages = Math.max(1, Math.ceil(total / CAMPAIGN_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pageIds = coveredIds.slice((page - 1) * CAMPAIGN_PAGE_SIZE, (page - 1 + Math.max(1, pageSpan)) * CAMPAIGN_PAGE_SIZE);

  // `getProductSummariesByIds` doesn't promise an order; restore the newest-first one.
  const summaries = pageIds.length ? await getProductSummariesByIds(pageIds) : [];
  const byId = new Map(summaries.map((summary) => [summary.id, summary]));
  const ordered = pageIds.map((id) => byId.get(id)).filter((s): s is CatalogProductSummary => Boolean(s));

  return {
    state: "live",
    name: row.name,
    slug: row.slug,
    description: row.description,
    summary: describeDefinition(campaign),
    countdownEndsAt: row.showCountdown && row.endsAt ? row.endsAt.toISOString() : null,
    products: ordered,
    total,
    page,
    totalPages,
  };
}

/** Slugs of live campaigns, for the sitemap. */
export async function getLiveCampaignSlugs(now: Date = new Date()): Promise<string[]> {
  const rows = await db.select({ slug: campaigns.slug, isActive: campaigns.isActive, startsAt: campaigns.startsAt, endsAt: campaigns.endsAt }).from(campaigns);
  return rows.filter((row) => campaignStatus(row, now) === "live").map((row) => row.slug);
}

