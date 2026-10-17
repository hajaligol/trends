import { cache } from "react";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { brands, orderItems, orders, products } from "@/lib/db/schema";

/**
 * Brand reads. Admin-facing functions see inactive brands too; the
 * storefront never reads this module for visibility decisions itself —
 * `catalog/queries.ts` joins `brands` and only exposes a brand whose
 * `isActive` is true.
 */

export type AdminBrandRow = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  logoUrl: string | null;
  countryOfOrigin: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
};

/** Every brand (active or not) with its product count, in display order. */
export async function listBrandsForAdmin(): Promise<AdminBrandRow[]> {
  const rows = await db
    .select({
      id: brands.id,
      slug: brands.slug,
      name: brands.name,
      nameEn: brands.nameEn,
      description: brands.description,
      logoUrl: brands.logoUrl,
      countryOfOrigin: brands.countryOfOrigin,
      displayOrder: brands.displayOrder,
      isActive: brands.isActive,
      // One grouped join, not a count query per brand.
      productCount: count(products.id),
    })
    .from(brands)
    .leftJoin(products, eq(products.brandId, brands.id))
    .groupBy(brands.id)
    .orderBy(asc(brands.displayOrder), asc(brands.name));
  return rows.map((row) => ({ ...row, productCount: Number(row.productCount) }));
}

export type BrandOption = { id: string; name: string; isActive: boolean };

/**
 * Choices for the product form's brand select: every **active** brand, plus
 * the product's current brand even if it has since been deactivated (so
 * opening and re-saving such a product doesn't silently drop its brand).
 */
export async function listBrandOptions(currentBrandId?: string | null): Promise<BrandOption[]> {
  const rows = await db
    .select({ id: brands.id, name: brands.name, isActive: brands.isActive })
    .from(brands)
    .where(currentBrandId ? sql`(${brands.isActive} = true OR ${brands.id} = ${currentBrandId})` : eq(brands.isActive, true))
    .orderBy(asc(brands.displayOrder), asc(brands.name));
  return rows;
}

export async function isBrandSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(excludeId ? and(eq(brands.slug, slug), ne(brands.id, excludeId)) : eq(brands.slug, slug))
    .limit(1);
  return Boolean(row);
}

/** Case-insensitive name clash (mirrors the `lower(name)` unique index). */
export async function isBrandNameTaken(name: string, excludeId?: string): Promise<boolean> {
  const sameName = sql`lower(${brands.name}) = lower(${name})`;
  const [row] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(excludeId ? and(sameName, ne(brands.id, excludeId)) : sameName)
    .limit(1);
  return Boolean(row);
}

export async function countProductsOfBrand(brandId: string): Promise<number> {
  const [row] = await db.select({ total: count() }).from(products).where(eq(products.brandId, brandId));
  return Number(row?.total ?? 0);
}

/**
 * Validates the brand chosen on a product form. `null` (no brand) is always
 * fine. A brand must exist and be active — except that a product may keep
 * the brand it already has even after that brand was deactivated.
 */
export async function getProductBrandError(
  brandId: string | null,
  currentBrandId: string | null = null,
): Promise<string | null> {
  if (!brandId) return null;
  const [brand] = await db
    .select({ isActive: brands.isActive })
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);
  if (!brand) return "برند انتخاب‌شده یافت نشد";
  if (!brand.isActive && brandId !== currentBrandId) {
    return "برند انتخاب‌شده غیرفعال است؛ ابتدا آن را فعال کنید یا برند دیگری انتخاب کنید";
  }
  return null;
}

/** What the header dropdown and the `/brands` page need. */
export type StorefrontBrand = {
  slug: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  logoUrl: string | null;
  countryOfOrigin: string | null;
  /** Active products only. */
  productCount: number;
  /** Units sold in orders that were actually paid (0 for a new brand). */
  unitsSold: number;
};

/** Order statuses that count as a real sale for the "best-selling" ranking. */
const SOLD_STATUSES = sql`('paid','processing','shipped','delivered')`;

/**
 * Active brands for the storefront, best-selling first.
 *
 * Ranking: units sold in paid-or-later orders (descending), then the admin's
 * `displayOrder`, then name — so a store with no sales yet shows brands in
 * the order the admin arranged them. Only brands with at least one **active**
 * product appear when `withProductsOnly` is set (the header: a tile that
 * leads to nothing is worse than no tile); the `/brands` page lists every
 * active brand.
 *
 * One grouped query: the order join is a left join, and `count(distinct)`
 * keeps the product count right despite the extra rows it produces.
 */
export async function listStorefrontBrands(
  options: { limit?: number; withProductsOnly?: boolean } = {},
): Promise<StorefrontBrand[]> {
  const { limit, withProductsOnly = false } = options;
  const unitsSold = sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${orders.status} in ${SOLD_STATUSES}), 0)`;

  const query = db
    .select({
      slug: brands.slug,
      name: brands.name,
      nameEn: brands.nameEn,
      description: brands.description,
      logoUrl: brands.logoUrl,
      countryOfOrigin: brands.countryOfOrigin,
      productCount: sql<number>`count(distinct ${products.id})`,
      unitsSold,
    })
    .from(brands)
    .leftJoin(products, and(eq(products.brandId, brands.id), eq(products.isActive, true)))
    .leftJoin(orderItems, eq(orderItems.productId, products.id))
    .leftJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(brands.isActive, true))
    .groupBy(brands.id)
    .having(withProductsOnly ? sql`count(distinct ${products.id}) > 0` : undefined)
    .orderBy(sql`${unitsSold} desc`, asc(brands.displayOrder), asc(brands.name));

  const rows = await (limit ? query.limit(limit) : query);
  return rows.map((row) => ({ ...row, productCount: Number(row.productCount), unitsSold: Number(row.unitsSold) }));
}

/** Lean, serializable brand for the header menu (passed as props to a Client Component on every page). */
export type NavBrand = { slug: string; name: string; nameEn: string | null; logoUrl: string | null };

/** How many brands the header dropdown shows (two rows of six). */
export const HEADER_BRAND_LIMIT = 12;

/** Trending / best-selling brands for the header dropdown. Deduplicated per request. */
export const getHeaderBrands = cache(async (): Promise<NavBrand[]> => {
  const rows = await listStorefrontBrands({ limit: HEADER_BRAND_LIMIT, withProductsOnly: true });
  return rows.map(({ slug, name, nameEn, logoUrl }) => ({ slug, name, nameEn, logoUrl }));
});
