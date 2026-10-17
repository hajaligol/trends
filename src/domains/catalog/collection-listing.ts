import { cache } from "react";
import { eq } from "drizzle-orm";
import { products } from "@/lib/db/schema";
import { EMPTY_LISTING_FILTERS, type ListingFilters } from "@/domains/catalog/listing-filters";
import type { ListingCandidate, ListingPage } from "@/domains/catalog/listing-engine";
import { DEFAULT_PRODUCT_SORT, type CollectionSlug, type ProductSort } from "@/domains/catalog/presentation";
import { finishListing, getTopSellingCandidates, loadListingCandidates } from "@/domains/catalog/queries";

export { LISTING_PAGE_SIZE as COLLECTION_PAGE_SIZE } from "@/domains/catalog/listing-engine";

/** The order a collection shows when the URL has no `sort`. */
export function collectionDefaultSort(slug: CollectionSlug): ProductSort {
  return slug === "top-selling" ? "best-selling" : DEFAULT_PRODUCT_SORT;
}

const loadCollection = cache((slug: CollectionSlug): Promise<ListingCandidate[]> => {
  if (slug === "featured") return loadListingCandidates(eq(products.isFeatured, true));
  if (slug === "top-selling") return getTopSellingCandidates();
  return loadListingCandidates(eq(products.isNewArrival, true));
});

export type CollectionPageResult = ListingPage;

/**
 * One page (or `pageSpan` consecutive pages) of a homepage collection, with
 * the same filters/sorts as every other list page. Paginated in application
 * code after one batched fetch — the same documented tradeoff as the
 * category/search pages.
 */
export async function getCollectionPage(
  slug: CollectionSlug,
  requestedPage: number,
  pageSpan = 1,
  filters: ListingFilters = EMPTY_LISTING_FILTERS,
): Promise<CollectionPageResult> {
  return finishListing({
    candidates: await loadCollection(slug),
    filters,
    defaultSort: collectionDefaultSort(slug),
    page: requestedPage,
    pageSpan,
  });
}
