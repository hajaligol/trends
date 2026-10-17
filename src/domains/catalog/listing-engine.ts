import { SIZE_PRESETS } from "./sizes";
import type { ListingFilters } from "./listing-filters";
import { DEFAULT_PRODUCT_SORT, type ProductSort } from "./presentation";
import type { CatalogProductSummary } from "./queries";

/**
 * Pure (no DB) filtering / sorting / facet / paging logic shared by every
 * product list page. The queries load a page's *candidates* once and hand
 * them here, so category, search, collection and campaign pages cannot drift
 * apart. Everything is computed from server data: the URL only supplies the
 * requested filter values, never a price, stock level or ranking.
 */

export const LISTING_PAGE_SIZE = 12;

export type ListingVariant = {
  size: string;
  color: string;
  colorHex: string | null;
  /** Price the shopper sees (campaign-adjusted), integer Toman. */
  priceToman: number;
  stock: number;
};

export type ListingCandidate = {
  summary: CatalogProductSummary;
  createdAt: Date;
  /** Active brands only — a product of an inactive brand has `null`. */
  brand: { slug: string; name: string; nameEn: string | null } | null;
  /** `order` = position in the taxonomy (for a stable facet order). */
  category: { slug: string; name: string; order: number };
  /** Active variants. */
  variants: ListingVariant[];
};

export type ListingFacets = {
  brands: Array<{ slug: string; name: string; nameEn: string | null }>;
  categories: Array<{ slug: string; name: string }>;
  sizes: string[];
  colors: Array<{ color: string; colorHex: string | null }>;
  /** Cheapest / dearest active variant in the whole list; null = no variants. */
  price: { min: number; max: number } | null;
};

export const EMPTY_FACETS: ListingFacets = { brands: [], categories: [], sizes: [], colors: [], price: null };

export type ListingPage = {
  products: CatalogProductSummary[];
  total: number;
  page: number;
  totalPages: number;
  facets: ListingFacets;
};

const LETTER_SIZES: readonly string[] = SIZE_PRESETS.find((preset) => preset.id === "letters")?.sizes ?? [];

/** XS…3XL first (in that order), then numbers ascending, then everything else. */
export function compareSizes(a: string, b: string): number {
  const rank = (size: string) => {
    const letter = LETTER_SIZES.indexOf(size.toUpperCase());
    if (letter >= 0) return { group: 0, value: letter };
    const numeric = Number(size);
    if (size.trim() !== "" && Number.isFinite(numeric)) return { group: 1, value: numeric };
    return { group: 2, value: 0 };
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra.group !== rb.group) return ra.group - rb.group;
  if (ra.value !== rb.value) return ra.value - rb.value;
  return a.localeCompare(b, "fa");
}

/** Options for each filter dropdown, from the whole (unfiltered) list so a
 * dropdown never loses its choices once a selection narrows the results. */
export function computeFacets(candidates: ListingCandidate[]): ListingFacets {
  const brands = new Map<string, { slug: string; name: string; nameEn: string | null }>();
  const categories = new Map<string, { slug: string; name: string; order: number }>();
  const sizes = new Set<string>();
  const colors = new Map<string, string | null>();
  let min = Infinity;
  let max = -Infinity;

  for (const candidate of candidates) {
    if (candidate.brand && !brands.has(candidate.brand.slug)) brands.set(candidate.brand.slug, candidate.brand);
    if (!categories.has(candidate.category.slug)) categories.set(candidate.category.slug, candidate.category);
    for (const variant of candidate.variants) {
      sizes.add(variant.size);
      if (!colors.has(variant.color)) colors.set(variant.color, variant.colorHex);
      if (variant.priceToman < min) min = variant.priceToman;
      if (variant.priceToman > max) max = variant.priceToman;
    }
  }

  return {
    brands: [...brands.values()].sort((a, b) => a.name.localeCompare(b.name, "fa")),
    categories: [...categories.values()]
      .sort((a, b) => a.order - b.order)
      .map(({ slug, name }) => ({ slug, name })),
    sizes: [...sizes].sort(compareSizes),
    colors: [...colors.entries()].map(([color, colorHex]) => ({ color, colorHex })),
    price: Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null,
  };
}

function variantMatches(variant: ListingVariant, filters: ListingFilters): boolean {
  if (filters.sizes.length > 0 && !filters.sizes.includes(variant.size)) return false;
  if (filters.colors.length > 0 && !filters.colors.includes(variant.color)) return false;
  if (filters.priceMin !== undefined && variant.priceToman < filters.priceMin) return false;
  if (filters.priceMax !== undefined && variant.priceToman > filters.priceMax) return false;
  if (filters.availableOnly && variant.stock <= 0) return false;
  return true;
}

/**
 * A product passes when its brand and category are selected (if any are) AND
 * at least one single variant satisfies every variant-level filter at once —
 * so "size M + black + in stock" means a black M that is actually in stock,
 * not "has an M somewhere and something black somewhere".
 */
export function filterCandidates(candidates: ListingCandidate[], filters: ListingFilters): ListingCandidate[] {
  const variantFiltersOn =
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    filters.availableOnly;

  return candidates.filter((candidate) => {
    if (filters.brands.length > 0 && !(candidate.brand && filters.brands.includes(candidate.brand.slug))) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(candidate.category.slug)) return false;
    if (!variantFiltersOn) return true;
    return candidate.variants.some((variant) => variantMatches(variant, filters));
  });
}

export function resolveSort(filters: ListingFilters, defaultSort: ProductSort = DEFAULT_PRODUCT_SORT): ProductSort {
  return filters.sort ?? defaultSort;
}

/** Newest first; id as the final tie-break so the order is stable between requests. */
function byNewest(a: ListingCandidate, b: ListingCandidate): number {
  const diff = b.createdAt.getTime() - a.createdAt.getTime();
  if (diff !== 0) return diff;
  return a.summary.id < b.summary.id ? -1 : a.summary.id > b.summary.id ? 1 : 0;
}

export function sortCandidates(
  candidates: ListingCandidate[],
  sort: ProductSort,
  unitsSold: ReadonlyMap<string, number> = new Map(),
): ListingCandidate[] {
  const list = [...candidates];
  switch (sort) {
    case "price-asc":
      return list.sort(
        (a, b) => (a.summary.fromPriceToman ?? Infinity) - (b.summary.fromPriceToman ?? Infinity) || byNewest(a, b),
      );
    case "price-desc":
      // Products without a price sink to the end in both directions.
      return list.sort((a, b) => {
        const pa = a.summary.fromPriceToman;
        const pb = b.summary.fromPriceToman;
        if (pa === null && pb !== null) return 1;
        if (pa !== null && pb === null) return -1;
        return (pb ?? 0) - (pa ?? 0) || byNewest(a, b);
      });
    case "discount":
      return list.sort((a, b) => b.summary.discountPercent - a.summary.discountPercent || byNewest(a, b));
    case "best-selling":
      return list.sort(
        (a, b) => (unitsSold.get(b.summary.id) ?? 0) - (unitsSold.get(a.summary.id) ?? 0) || byNewest(a, b),
      );
    case "newest":
    default:
      return list.sort(byNewest);
  }
}

/**
 * Filter → sort → page. `page`/`pageSpan` follow the list pages' infinite
 * scroll contract: `pageSpan` consecutive pages starting at `page` are returned
 * (page clamped into range, as before). A list with no candidates at all has
 * `totalPages: 0`; one that is merely filtered down to nothing has 1.
 */
export function runListing(params: {
  candidates: ListingCandidate[];
  filters: ListingFilters;
  defaultSort?: ProductSort;
  unitsSold?: ReadonlyMap<string, number>;
  page?: number;
  pageSpan?: number;
}): ListingPage {
  const { candidates, filters } = params;
  const facets = computeFacets(candidates);
  if (candidates.length === 0) return { products: [], total: 0, page: 1, totalPages: 0, facets };

  const sorted = sortCandidates(
    filterCandidates(candidates, filters),
    resolveSort(filters, params.defaultSort),
    params.unitsSold,
  );
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / LISTING_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), totalPages);
  const start = (page - 1) * LISTING_PAGE_SIZE;
  const end = start + LISTING_PAGE_SIZE * Math.max(1, params.pageSpan ?? 1);
  return { products: sorted.slice(start, end).map((c) => c.summary), total, page, totalPages, facets };
}
