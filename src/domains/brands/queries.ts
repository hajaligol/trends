import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { brands, products } from "@/lib/db/schema";

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
