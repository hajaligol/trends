import { toLatinDigits } from "@/lib/utils/digits";
import { DEFAULT_PRODUCT_SORT, isProductSort, type ProductSort } from "./presentation";

/**
 * The filter/sort state shared by every product list page (category, search,
 * homepage collections, sale campaigns). Client-safe on purpose — no DB
 * import — so the filter bar (a Client Component) builds the very same URLs
 * the server parses.
 *
 * URL contract (all optional, repeated params for multi-select):
 *   ?sort=price-asc  ?brand=<slug>&brand=<slug>  ?cat=<category slug>…
 *   ?size=M&size=L   ?color=مشکی  ?min=500000&max=2000000  ?available=1  ?page=2
 *
 * `size` / `color` keep the names the old single-select filters used, so
 * previously shared links still work.
 */
export type ListingFilters = {
  /** `undefined` = the page's default order. */
  sort?: ProductSort;
  /** Brand slugs. */
  brands: string[];
  /** Category slugs (the product's own type category). */
  categories: string[];
  sizes: string[];
  colors: string[];
  /** Toman, inclusive. */
  priceMin?: number;
  priceMax?: number;
  /** true → hide products that are out of stock. */
  availableOnly: boolean;
};

export const EMPTY_LISTING_FILTERS: ListingFilters = {
  brands: [],
  categories: [],
  sizes: [],
  colors: [],
  availableOnly: false,
};

/** Hard caps — the filters arrive from the URL / a Server Action. */
export const LISTING_LIMITS = {
  maxValuesPerFacet: 30,
  maxValueLength: 100,
  maxPriceToman: 1_000_000_000_000,
} as const;

type RawParams = Record<string, string | string[] | undefined>;

function valuesOf(raw: string | string[] | undefined): string[] {
  const list = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  const out: string[] = [];
  for (const item of list) {
    const value = item.trim();
    if (value.length === 0 || value.length > LISTING_LIMITS.maxValueLength || out.includes(value)) continue;
    out.push(value);
    if (out.length >= LISTING_LIMITS.maxValuesPerFacet) break;
  }
  return out;
}

/** Digits (Persian/Arabic/Latin) with any separators → a safe integer, or undefined. */
export function parsePriceInput(raw: string | undefined | null): number | undefined {
  if (!raw) return undefined;
  const digits = toLatinDigits(raw).replace(/\D/g, "");
  if (digits.length === 0 || digits.length > 13) return undefined;
  const value = Number(digits);
  return Number.isSafeInteger(value) && value <= LISTING_LIMITS.maxPriceToman ? value : undefined;
}

function firstOf(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Order-independent comparison/serialisation, so equal filters give equal URLs. */
function canonical(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, "fa"));
}

/** Normalises anything coming from a URL (never trusted) into `ListingFilters`. */
export function parseListingFilters(raw: RawParams): ListingFilters {
  const sortParam = firstOf(raw.sort);
  let priceMin = parsePriceInput(firstOf(raw.min));
  let priceMax = parsePriceInput(firstOf(raw.max));
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }
  const available = firstOf(raw.available);
  return {
    sort: sortParam && isProductSort(sortParam) ? sortParam : undefined,
    brands: canonical(valuesOf(raw.brand)),
    categories: canonical(valuesOf(raw.cat)),
    sizes: canonical(valuesOf(raw.size)),
    colors: canonical(valuesOf(raw.color)),
    priceMin,
    priceMax,
    availableOnly: available === "1" || available === "true",
  };
}

/** Number of filter *groups* in use (sort excluded) — for the "clear all" link. */
export function countActiveFilters(filters: ListingFilters): number {
  return (
    (filters.brands.length > 0 ? 1 : 0) +
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.sizes.length > 0 ? 1 : 0) +
    (filters.colors.length > 0 ? 1 : 0) +
    (filters.priceMin !== undefined || filters.priceMax !== undefined ? 1 : 0) +
    (filters.availableOnly ? 1 : 0)
  );
}

export function hasPriceFilter(filters: ListingFilters): boolean {
  return filters.priceMin !== undefined || filters.priceMax !== undefined;
}

/** Sort/filters that make a URL a near-duplicate of the clean list URL. */
export function isDefaultListing(filters: ListingFilters, defaultSort: ProductSort = DEFAULT_PRODUCT_SORT): boolean {
  return countActiveFilters(filters) === 0 && (filters.sort === undefined || filters.sort === defaultSort);
}

export function listingFiltersToSearchParams(
  filters: ListingFilters,
  defaultSort: ProductSort = DEFAULT_PRODUCT_SORT,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.sort && filters.sort !== defaultSort) params.set("sort", filters.sort);
  for (const slug of canonical(filters.brands)) params.append("brand", slug);
  for (const slug of canonical(filters.categories)) params.append("cat", slug);
  for (const size of canonical(filters.sizes)) params.append("size", size);
  for (const color of canonical(filters.colors)) params.append("color", color);
  if (filters.priceMin !== undefined) params.set("min", String(filters.priceMin));
  if (filters.priceMax !== undefined) params.set("max", String(filters.priceMax));
  if (filters.availableOnly) params.set("available", "1");
  return params;
}

/**
 * URL of a list page for a filter state, omitting defaults so the unfiltered
 * URL stays clean. `q` is the search page's query; `page` > 1 is appended.
 */
export function buildListingHref(
  basePath: string,
  filters: ListingFilters,
  options: { defaultSort?: ProductSort; q?: string; page?: number } = {},
): string {
  const params = new URLSearchParams();
  if (options.q) params.set("q", options.q);
  for (const [key, value] of listingFiltersToSearchParams(filters, options.defaultSort ?? DEFAULT_PRODUCT_SORT)) {
    params.append(key, value);
  }
  if (options.page && options.page > 1) params.set("page", String(options.page));
  const query = params.toString();
  return `${basePath}${query ? `?${query}` : ""}`;
}
