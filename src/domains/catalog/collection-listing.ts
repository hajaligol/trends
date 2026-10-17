import { cache } from "react";
import type { CollectionSlug } from "@/domains/catalog/presentation";
import { getFeaturedProducts, getNewArrivals, getTopSellingProducts, type CatalogProductSummary } from "@/domains/catalog/queries";

export const COLLECTION_PAGE_SIZE = 12;

const loadCollection = cache((slug: CollectionSlug) => {
  if (slug === "featured") return getFeaturedProducts();
  if (slug === "top-selling") return getTopSellingProducts();
  return getNewArrivals();
});

export type CollectionPageResult = {
  products: CatalogProductSummary[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * One page (or `pageSpan` consecutive pages) of a homepage collection.
 * Paginated in application code after one batched fetch — the same
 * documented tradeoff as the category/search pages.
 */
export async function getCollectionPage(slug: CollectionSlug, requestedPage: number, pageSpan = 1): Promise<CollectionPageResult> {
  const all = await loadCollection(slug);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / COLLECTION_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * COLLECTION_PAGE_SIZE;
  return {
    products: all.slice(start, start + COLLECTION_PAGE_SIZE * Math.max(1, pageSpan)),
    total,
    page,
    totalPages,
  };
}
