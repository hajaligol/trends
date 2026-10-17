import { cache } from "react";
import { and, eq, gt, isNull, lte, or, inArray } from "drizzle-orm";
import { db, type DbTransaction } from "@/lib/db/client";
import { campaignTargets, campaigns, categories, type CampaignRow, type CampaignTargetRow } from "@/lib/db/schema";
import { collectDescendantIdsFromFlat } from "@/domains/categories/tree";
import { parseCampaignConfig } from "./config";
import type { CampaignScope, EngineCampaign } from "./engine";

/**
 * The only sanctioned reader of campaigns for pricing. Everything that puts
 * a price in front of a customer or on an order goes through
 * `loadActiveCampaigns`, so "which campaigns are live right now" is decided
 * in exactly one place, from the database, with the config re-validated.
 */

type Executor = typeof db | DbTransaction;

export function buildScope(
  row: Pick<CampaignRow, "appliesToAll">,
  targets: Pick<CampaignTargetRow, "brandId" | "categoryId" | "productId" | "isExclusion">[],
  categoryRows: Array<{ id: string; parentId: string | null }>,
): CampaignScope {
  const brandIds = new Set<string>();
  const productIds = new Set<string>();
  const categoryIds = new Set<string>();
  const excludedBrandIds = new Set<string>();
  const excludedProductIds = new Set<string>();
  const excludedCategoryIds = new Set<string>();
  for (const target of targets) {
    if (target.brandId) (target.isExclusion ? excludedBrandIds : brandIds).add(target.brandId);
    if (target.productId) (target.isExclusion ? excludedProductIds : productIds).add(target.productId);
    if (target.categoryId) {
      // A category covers its whole subtree (audience → group → type).
      const subtree = collectDescendantIdsFromFlat(categoryRows, target.categoryId);
      for (const id of subtree) (target.isExclusion ? excludedCategoryIds : categoryIds).add(id);
    }
  }
  return {
    appliesToAll: row.appliesToAll,
    brandIds,
    categoryIds,
    productIds,
    excludedBrandIds,
    excludedCategoryIds,
    excludedProductIds,
  };
}

/** Turns a DB row into an engine campaign, or `null` if its config is invalid. */
export function toEngineCampaign(
  row: CampaignRow,
  targets: CampaignTargetRow[],
  categoryRows: Array<{ id: string; parentId: string | null }>,
): EngineCampaign | null {
  const parsed = parseCampaignConfig(row.kind, row.config);
  if (!parsed.ok) {
    console.error(`Campaign ${row.id} ignored: invalid config (${parsed.error})`);
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    stackable: row.stackable,
    showCountdown: row.showCountdown,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    scope: buildScope(row, targets, categoryRows),
    ...parsed.definition,
  } as EngineCampaign;
}

/** Campaigns that are on right now: active flag + inside their time window. */
export async function loadActiveCampaigns(executor: Executor = db, now: Date = new Date()): Promise<EngineCampaign[]> {
  const rows = await executor
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.isActive, true),
        or(isNull(campaigns.startsAt), lte(campaigns.startsAt, now)),
        or(isNull(campaigns.endsAt), gt(campaigns.endsAt, now)),
      ),
    );
  if (rows.length === 0) return [];

  const [targetRows, categoryRows] = await Promise.all([
    executor
      .select()
      .from(campaignTargets)
      .where(inArray(campaignTargets.campaignId, rows.map((row) => row.id))),
    executor.select({ id: categories.id, parentId: categories.parentId }).from(categories),
  ]);

  const result: EngineCampaign[] = [];
  for (const row of rows) {
    const campaign = toEngineCampaign(
      row,
      targetRows.filter((target) => target.campaignId === row.id),
      categoryRows,
    );
    if (campaign) result.push(campaign);
  }
  return result;
}

/** Per-request memoised view for storefront rendering (several catalog
 * queries on one page share one load). Never used for order creation. */
export const getActiveCampaignsForRequest = cache(() => loadActiveCampaigns(db));
