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
export type ProductSort = "newest" | "price-asc" | "price-desc";

export const PRODUCT_SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: "newest", label: "جدیدترین" },
  { value: "price-asc", label: "ارزان‌ترین" },
  { value: "price-desc", label: "گران‌ترین" },
];

export function isProductSort(value: string): value is ProductSort {
  return value === "newest" || value === "price-asc" || value === "price-desc";
}

/**
 * Current filter/sort/page state for a category page, used to build
 * shareable URLs (TRENDS_PROJECT_CONTEXT.md §5 "Search result pagination"
 * / "URL-driven search/filter state" — applied here a phase early since
 * it's the same pattern the category listing needs anyway).
 */
export type CategoryQueryState = {
  sort?: ProductSort;
  size?: string;
  color?: string;
  page?: number;
};

/**
 * Builds a `/category/[slug]` URL for a given filter/sort/page state,
 * omitting anything at its default value so the "no filters" URL stays
 * clean (`/category/men`, not `/category/men?sort=newest&page=1`).
 * Sort/filter controls each call this with one field overridden from the
 * current state to link to "what the page would look like if I changed
 * just this" — no client-side JS/routing needed for any of them.
 */
export function buildCategoryHref(slug: string, state: CategoryQueryState): string {
  const params = new URLSearchParams();
  if (state.sort && state.sort !== "newest") params.set("sort", state.sort);
  if (state.size) params.set("size", state.size);
  if (state.color) params.set("color", state.color);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return `/category/${slug}${query ? `?${query}` : ""}`;
}

/**
 * Search-page equivalent of `CategoryQueryState`/`buildCategoryHref` —
 * same "omit defaults, build a shareable URL" pattern, keyed on the
 * search query string instead of a category slug.
 */
export type SearchQueryState = {
  q: string;
  sort?: ProductSort;
  page?: number;
};

export function buildSearchHref(state: SearchQueryState): string {
  const params = new URLSearchParams();
  params.set("q", state.q);
  if (state.sort && state.sort !== "newest") params.set("sort", state.sort);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  return `/search?${params.toString()}`;
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
