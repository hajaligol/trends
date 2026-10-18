import { firstParam, normalizeSearchText, textIncludes, type RawParam } from "@/lib/utils/admin-filters";
import type { AdminBrandRow } from "./queries";

/** In-memory filter for `/admin/brands` (a short, curated list). */

export type BrandListFilter = {
  q?: string;
  status?: "active" | "inactive";
  products?: "with" | "without";
  country?: string;
};

const pick = <T extends string>(value: RawParam, allowed: readonly T[]): T | undefined => {
  const v = Array.isArray(value) ? value[0] : value;
  return allowed.find((item) => item === v);
};

export function parseBrandFilter(raw: { q?: RawParam; status?: RawParam; products?: RawParam; country?: RawParam }): BrandListFilter {
  return {
    q: normalizeSearchText(raw.q),
    status: pick(raw.status, ["active", "inactive"] as const),
    products: pick(raw.products, ["with", "without"] as const),
    // Compared for equality against stored values, so not normalised.
    country: firstParam(raw.country) || undefined,
  };
}

export function isBrandFilterActive(filter: BrandListFilter): boolean {
  return Boolean(filter.q || filter.status || filter.products || filter.country);
}

export function filterBrandsIgnoringStatus(brands: AdminBrandRow[], filter: BrandListFilter): AdminBrandRow[] {
  return brands.filter((brand) => {
    if (filter.products === "with" && brand.productCount === 0) return false;
    if (filter.products === "without" && brand.productCount > 0) return false;
    if (filter.country && brand.countryOfOrigin !== filter.country) return false;
    if (filter.q) {
      const hit =
        textIncludes(brand.name, filter.q) ||
        textIncludes(brand.nameEn, filter.q) ||
        textIncludes(brand.slug, filter.q) ||
        textIncludes(brand.countryOfOrigin, filter.q);
      if (!hit) return false;
    }
    return true;
  });
}

export function filterBrands(brands: AdminBrandRow[], filter: BrandListFilter): AdminBrandRow[] {
  const base = filterBrandsIgnoringStatus(brands, filter);
  if (!filter.status) return base;
  return base.filter((brand) => brand.isActive === (filter.status === "active"));
}

/** Distinct, sorted countries present on the brands (for the select). */
export function brandCountries(brands: AdminBrandRow[]): string[] {
  return [...new Set(brands.map((brand) => brand.countryOfOrigin).filter((value): value is string => Boolean(value)))].sort((a, b) =>
    a.localeCompare(b, "fa"),
  );
}
