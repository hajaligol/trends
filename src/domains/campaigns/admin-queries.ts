import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  brands,
  campaignTargets,
  campaigns,
  categories,
  orderCampaignApplications,
  productVariants,
  products,
  type CampaignRow,
} from "@/lib/db/schema";
import { categoryPathLabel, getCategoryTrail } from "@/domains/categories/tree";
import { parseCampaignConfig, type CampaignDefinition } from "./config";
import { campaignCoversProduct, priceAfterPriceCampaign } from "./engine";
import { describeDefinition } from "./labels";
import { buildScope, loadActiveCampaigns } from "./queries";
import type { CampaignPreviewInput } from "./admin-schema";

/** Read side of the admin campaign screens. Authorization is the caller's job
 * (the `/admin` layout gate + each Server Action re-checks the role). */

export type AdminCampaignListItem = {
  row: CampaignRow;
  summary: string;
  configValid: boolean;
  brandCount: number;
  categoryCount: number;
  productCount: number;
  excludedCount: number;
  orderCount: number;
  discountGivenToman: number;
};

export async function listCampaignsForAdmin(): Promise<AdminCampaignListItem[]> {
  const rows = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);

  const [targetCounts, usage] = await Promise.all([
    db
      .select({
        campaignId: campaignTargets.campaignId,
        brands: sql<number>`count(*) filter (where ${campaignTargets.brandId} is not null and not ${campaignTargets.isExclusion})::int`,
        categories: sql<number>`count(*) filter (where ${campaignTargets.categoryId} is not null and not ${campaignTargets.isExclusion})::int`,
        products: sql<number>`count(*) filter (where ${campaignTargets.productId} is not null and not ${campaignTargets.isExclusion})::int`,
        excluded: sql<number>`count(*) filter (where ${campaignTargets.isExclusion})::int`,
      })
      .from(campaignTargets)
      .where(inArray(campaignTargets.campaignId, ids))
      .groupBy(campaignTargets.campaignId),
    db
      .select({
        campaignId: orderCampaignApplications.campaignId,
        orders: sql<number>`count(distinct ${orderCampaignApplications.orderId})::int`,
        discount: sql<number>`coalesce(sum(${orderCampaignApplications.discountToman} + ${orderCampaignApplications.shippingDiscountToman}), 0)::bigint`,
      })
      .from(orderCampaignApplications)
      .where(inArray(orderCampaignApplications.campaignId, ids))
      .groupBy(orderCampaignApplications.campaignId),
  ]);
  const targetsById = new Map(targetCounts.map((t) => [t.campaignId, t]));
  const usageById = new Map(usage.map((u) => [u.campaignId, u]));

  return rows.map((row) => {
    const parsed = parseCampaignConfig(row.kind, row.config);
    const t = targetsById.get(row.id);
    const u = usageById.get(row.id);
    return {
      row,
      summary: parsed.ok ? describeDefinition(parsed.definition) : "تنظیمات نامعتبر",
      configValid: parsed.ok,
      brandCount: t?.brands ?? 0,
      categoryCount: t?.categories ?? 0,
      productCount: t?.products ?? 0,
      excludedCount: t?.excluded ?? 0,
      orderCount: u?.orders ?? 0,
      discountGivenToman: Number(u?.discount ?? 0),
    };
  });
}

export type PickerProduct = { id: string; title: string; productCode: number };

export type AdminCampaignDetail = {
  row: CampaignRow;
  definition: CampaignDefinition | null;
  brandIds: string[];
  categoryIds: string[];
  products: PickerProduct[];
  excludedProducts: PickerProduct[];
};

export async function getCampaignForAdmin(id: string): Promise<AdminCampaignDetail | null> {
  const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!row) return null;
  const targets = await db.select().from(campaignTargets).where(eq(campaignTargets.campaignId, id));
  const productIds = targets.filter((t) => t.productId).map((t) => t.productId!);
  const productRows = productIds.length
    ? await db
        .select({ id: products.id, title: products.title, productCode: products.productCode })
        .from(products)
        .where(inArray(products.id, productIds))
    : [];
  const byId = new Map(productRows.map((p) => [p.id, p]));
  const pick = (exclusion: boolean) =>
    targets
      .filter((t) => t.productId && t.isExclusion === exclusion)
      .map((t) => byId.get(t.productId!))
      .filter((p): p is PickerProduct => Boolean(p));
  const parsed = parseCampaignConfig(row.kind, row.config);
  return {
    row,
    definition: parsed.ok ? parsed.definition : null,
    brandIds: targets.filter((t) => t.brandId && !t.isExclusion).map((t) => t.brandId!),
    categoryIds: targets.filter((t) => t.categoryId && !t.isExclusion).map((t) => t.categoryId!),
    products: pick(false),
    excludedProducts: pick(true),
  };
}

export type PickerBrand = { id: string; name: string; isActive: boolean };
export type PickerCategory = { id: string; name: string; parentId: string | null; depth: number; path: string };

export async function getCampaignPickerOptions(): Promise<{ brands: PickerBrand[]; categories: PickerCategory[] }> {
  const [brandRows, categoryRows] = await Promise.all([
    db
      .select({ id: brands.id, name: brands.name, isActive: brands.isActive })
      .from(brands)
      .orderBy(asc(brands.displayOrder), asc(brands.name)),
    db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        description: categories.description,
        imageUrl: categories.imageUrl,
        parentId: categories.parentId,
        displayOrder: categories.displayOrder,
        isActive: categories.isActive,
      })
      .from(categories),
  ]);

  // Depth-first so children follow their parent, in display order.
  const children = new Map<string | null, typeof categoryRows>();
  for (const row of categoryRows) {
    const bucket = children.get(row.parentId) ?? [];
    bucket.push(row);
    children.set(row.parentId, bucket);
  }
  const ordered: PickerCategory[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const row of (children.get(parentId) ?? []).sort((a, b) => a.displayOrder - b.displayOrder)) {
      ordered.push({
        id: row.id,
        name: row.name,
        parentId: row.parentId,
        depth,
        path: categoryPathLabel(getCategoryTrail(categoryRows, row.id)),
      });
      walk(row.id, depth + 1);
    }
  };
  walk(null, 0);
  return { brands: brandRows, categories: ordered };
}

/** Product search for the picker: title substring or exact product code. */
export async function searchProductsForPicker(rawQuery: string, limit = 15): Promise<PickerProduct[]> {
  const q = rawQuery.trim().slice(0, 80);
  if (q.length < 2) return [];
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const code = /^\d{1,9}$/.test(q) ? Number(q) : null;
  return db
    .select({ id: products.id, title: products.title, productCode: products.productCode })
    .from(products)
    .where(or(ilike(products.title, `%${escaped}%`), code === null ? undefined : eq(products.productCode, code)))
    .orderBy(asc(products.title))
    .limit(limit);
}

export type CampaignPreview = {
  matchedCount: number;
  activeProductCount: number;
  sample: Array<{ title: string; productCode: number; regularPriceToman: number | null; salePriceToman: number | null }>;
  overlapNames: string[];
};

/** "Who would this campaign cover, and at what price?" — read-only. */
export async function previewCampaignCoverage(
  input: CampaignPreviewInput,
  definition: CampaignDefinition,
): Promise<CampaignPreview> {
  const categoryRows = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories);
  const targets = [
    ...input.brandIds.map((brandId) => ({ brandId, categoryId: null, productId: null, isExclusion: false })),
    ...input.categoryIds.map((categoryId) => ({ brandId: null, categoryId, productId: null, isExclusion: false })),
    ...input.productIds.map((productId) => ({ brandId: null, categoryId: null, productId, isExclusion: false })),
    ...input.excludedProductIds.map((productId) => ({ brandId: null, categoryId: null, productId, isExclusion: true })),
  ];
  const scope = buildScope({ appliesToAll: input.appliesToAll }, targets, categoryRows);

  const active = await db
    .select({
      id: products.id,
      title: products.title,
      productCode: products.productCode,
      brandId: products.brandId,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.productCode));
  const matched = active.filter((p) => campaignCoversProduct(scope, { productId: p.id, brandId: p.brandId, categoryId: p.categoryId }));

  const sampleProducts = matched.slice(0, 5);
  const prices = sampleProducts.length
    ? await db
        .select({ productId: productVariants.productId, price: sql<number>`min(${productVariants.priceToman})::int` })
        .from(productVariants)
        .where(and(inArray(productVariants.productId, sampleProducts.map((p) => p.id)), eq(productVariants.isActive, true)))
        .groupBy(productVariants.productId)
    : [];
  const priceById = new Map(prices.map((p) => [p.productId, p.price]));
  const isPriceLevel = ["percent_off", "amount_off", "fixed_price"].includes(definition.kind);

  const live = (await loadActiveCampaigns(db)).filter((c) => c.id !== input.excludeCampaignId);
  const overlapNames = live
    .filter((c) => matched.some((p) => campaignCoversProduct(c.scope, { productId: p.id, brandId: p.brandId, categoryId: p.categoryId })))
    .map((c) => c.name);

  return {
    matchedCount: matched.length,
    activeProductCount: active.length,
    sample: sampleProducts.map((p) => {
      const regular = priceById.get(p.id) ?? null;
      return {
        title: p.title,
        productCode: p.productCode,
        regularPriceToman: regular,
        salePriceToman: isPriceLevel && regular !== null ? priceAfterPriceCampaign(definition, regular) : null,
      };
    }),
    overlapNames: [...new Set(overlapNames)],
  };
}
