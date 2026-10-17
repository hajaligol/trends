import type { CategorySwatch } from "./demo-data";

/**
 * Presentation-only catalog constants/helpers that have **no dependency
 * on `@/lib/db`**. That's the whole point of this file existing
 * separately from `queries.ts`: `queries.ts` imports the Drizzle client
 * (which touches `DATABASE_URL`/`postgres` at module-eval time), so it
 * must never be imported from a `"use client"` component — Next.js would
 * try to bundle the Postgres driver for the browser. Anything a client
 * component needs (sort-option labels, category swatch colors, ...)
 * belongs here instead.
 */
export type ProductSort = "newest" | "price-asc" | "price-desc" | "discount" | "best-selling";

/** Order of the sort dropdown on every product list page. */
export const PRODUCT_SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: "price-asc", label: "ارزان‌ترین" },
  { value: "price-desc", label: "گران‌ترین" },
  { value: "newest", label: "جدیدترین" },
  { value: "discount", label: "بیشترین تخفیف" },
  { value: "best-selling", label: "پرفروش‌ترین" },
];

/** What a list page shows when the URL has no `sort` (the top-selling
 * collection overrides it with "best-selling"). */
export const DEFAULT_PRODUCT_SORT: ProductSort = "newest";

/**
 * Product list pages (category, search, collections, campaigns) load pages
 * 1..`INFINITE_SCROLL_MAX_PAGE` by infinite scroll; from the next page on,
 * classic numbered pagination takes over.
 *
 * `?page=N` with N <= the limit means "pages 1..N already loaded" (so a
 * refresh / back navigation / no-JS link reproduces what the visitor was
 * looking at); N above the limit is a plain single page.
 */
export const INFINITE_SCROLL_MAX_PAGE = 5;

/** Shared by `ProductGrid` and the infinite-scroll grid so they match. */
export const PRODUCT_GRID_CLASS = "grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4";

export type ListingWindow = {
  /** First page the server query should return. */
  fetchPage: number;
  /** How many consecutive pages the server query should return. */
  pageSpan: number;
  /** true → infinite-scroll zone (pages 1..5); false → numbered-pagination zone. */
  infinite: boolean;
};

export function listingWindowFor(requestedPage: number): ListingWindow {
  const page = Number.isFinite(requestedPage) && requestedPage >= 1 ? Math.floor(requestedPage) : 1;
  if (page <= INFINITE_SCROLL_MAX_PAGE) return { fetchPage: 1, pageSpan: page, infinite: true };
  return { fetchPage: page, pageSpan: 1, infinite: false };
}

/**
 * Given what the server query returned, how far the list has been loaded
 * and how far infinite scroll may still go.
 */
export function listingProgress(window: ListingWindow, requestedPage: number, totalPages: number, resultPage: number) {
  const lastInfinitePage = Math.max(1, Math.min(INFINITE_SCROLL_MAX_PAGE, totalPages));
  const loadedThrough = window.infinite ? Math.min(Math.max(1, requestedPage), lastInfinitePage) : resultPage;
  return {
    loadedThrough,
    lastInfinitePage,
    /** Infinite scroll can still append pages after the initial render. */
    hasMore: window.infinite && loadedThrough < lastInfinitePage,
    /** Numbered pagination is needed once infinite scroll has run its course. */
    needsPagination: totalPages > INFINITE_SCROLL_MAX_PAGE,
    /** A page number > 5 that the query clamped back into the infinite zone
     * (e.g. `?page=99` on a 3-page list) should be redirected there. */
    clampedIntoInfiniteZone: !window.infinite && resultPage <= INFINITE_SCROLL_MAX_PAGE,
  };
}

export function isProductSort(value: string): value is ProductSort {
  return PRODUCT_SORT_OPTIONS.some((option) => option.value === value);
}

/**
 * UI-only pastel swatch assignment for category circles/badges. This is
 * deliberately *not* a database column: which pastel color a category's
 * circle uses is presentation styling, not catalog data a store operator
 * needs to manage, so per TRENDS_PROJECT_CONTEXT.md §12 ("use the simplest
 * schema that fully represents the requirements") it lives here instead of
 * on `categories`. If Phase 11's admin area later wants operators to pick
 * a category's accent color themselves, promote this to a real column
 * then — not speculatively now.
 */
const SWATCH_BY_SLUG: Record<string, CategorySwatch> = {
  men: "sage",
  women: "blush",
  kids: "yellow",
};

/** Tailwind background class per swatch (literal strings, so Tailwind's
 * source scan picks them up). Mirrors the prototype's pastel circles. */
export const SWATCH_BG_CLASS: Record<CategorySwatch, string> = {
  sage: "bg-sage",
  blush: "bg-blush",
  blue: "bg-blue",
  yellow: "bg-yellow",
  lavender: "bg-lavender",
  aqua: "bg-aqua",
};

const SWATCH_FALLBACK_ORDER: CategorySwatch[] = [
  "sage",
  "blush",
  "blue",
  "yellow",
  "lavender",
  "aqua",
];

/**
 * Looks up the swatch for a known top-level category slug, falling back
 * to a deterministic cycle through the palette (keyed by `fallbackIndex`,
 * e.g. the category's position in a list) for everything else — which
 * is how the four groups under an audience (لباس/کفش/کیف/اکسسوری) get
 * four different pastels on the category page tiles.
 */
export function swatchForCategorySlug(slug: string, fallbackIndex = 0): CategorySwatch {
  const known = SWATCH_BY_SLUG[slug];
  if (known) return known;
  return SWATCH_FALLBACK_ORDER[fallbackIndex % SWATCH_FALLBACK_ORDER.length] ?? "sage";
}


/**
 * Homepage product rows ("شگفت‌انگیزها", "پرفروش‌ترین محصولات",
 * "جدیدترین محصولات"). A row shows at most `HOME_ROW_MAX_PRODUCTS`
 * products; if the section has more, the row ends with a "show all"
 * tile that links to `/collection/<slug>` (the scroll arrows stay).
 */
export const HOME_ROW_MAX_PRODUCTS = 10;

export const COLLECTIONS = {
  featured: { title: "شگفت‌انگیزها", description: "محصولات ویژه و منتخب ترندز" },
  "top-selling": { title: "پرفروش‌ترین محصولات", description: "پرفروش‌ترین محصولات ترندز" },
  "new-arrivals": { title: "جدیدترین محصولات", description: "تازه‌ترین محصولات ترندز" },
} as const;

export type CollectionSlug = keyof typeof COLLECTIONS;

export function isCollectionSlug(value: string): value is CollectionSlug {
  return Object.prototype.hasOwnProperty.call(COLLECTIONS, value);
}
