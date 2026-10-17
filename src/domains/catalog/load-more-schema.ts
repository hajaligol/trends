import { z } from "zod";
import { LISTING_LIMITS } from "@/domains/catalog/listing-filters";
import { INFINITE_SCROLL_MAX_PAGE, PRODUCT_SORT_OPTIONS, type ProductSort } from "@/domains/catalog/presentation";

const facetValues = z
  .array(z.string().trim().min(1).max(LISTING_LIMITS.maxValueLength))
  .max(LISTING_LIMITS.maxValuesPerFacet)
  .default([]);

const price = z.number().int().min(0).max(LISTING_LIMITS.maxPriceToman).optional();

/**
 * The filters of the list being continued. Arrives from the browser, so it is
 * validated here with the same bounds the URL parser applies.
 */
export const listingFiltersSchema = z.object({
  sort: z.enum(PRODUCT_SORT_OPTIONS.map((option) => option.value) as [ProductSort, ...ProductSort[]]).optional(),
  brands: facetValues,
  categories: facetValues,
  sizes: facetValues,
  colors: facetValues,
  priceMin: price,
  priceMax: price,
  availableOnly: z.boolean().default(false),
});

/**
 * Which list an infinite-scroll grid is continuing. Validated on the server
 * (it arrives from the browser); a client-safe module so the client
 * component can import the type without touching the DB.
 */
export const loadMoreSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("category"), slug: z.string().min(1).max(200), filters: listingFiltersSchema }),
  z.object({ kind: z.literal("search"), q: z.string().trim().min(1).max(200), filters: listingFiltersSchema }),
  z.object({
    kind: z.literal("collection"),
    slug: z.enum(["featured", "top-selling", "new-arrivals"]),
    filters: listingFiltersSchema,
  }),
  z.object({ kind: z.literal("campaign"), slug: z.string().min(1).max(200), filters: listingFiltersSchema }),
]);

export type LoadMoreSource = z.infer<typeof loadMoreSourceSchema>;

export const loadMoreInputSchema = z.object({
  source: loadMoreSourceSchema,
  // Page 1 is rendered by the server; infinite scroll only ever asks for 2..5.
  page: z.number().int().min(2).max(INFINITE_SCROLL_MAX_PAGE),
});
