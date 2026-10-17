"use server";

import type { ReactNode } from "react";
import { ProductCard } from "@/components/catalog/ProductCard";
import { getCampaignLanding } from "@/domains/campaigns/landing";
import { getCollectionPage } from "@/domains/catalog/collection-listing";
import { loadMoreInputSchema, type LoadMoreSource } from "@/domains/catalog/load-more-schema";
import { getProductsByCategorySlug, searchProducts, type CatalogProductSummary } from "@/domains/catalog/queries";
import { normalizeSlugParam } from "@/domains/catalog/slug";
import { checkIpRateLimit } from "@/lib/security/rate-limit";

export type LoadMoreResult =
  | { ok: true; page: number; count: number; cards: ReactNode }
  | { ok: false; error: string };

async function fetchPage(source: LoadMoreSource, page: number): Promise<CatalogProductSummary[] | null> {
  switch (source.kind) {
    case "category": {
      const result = await getProductsByCategorySlug({ slug: source.slug, filters: source.filters, page });
      // The query clamps out-of-range pages to the last one; that would repeat
      // products already on screen, so an out-of-range page is just "no more".
      return result && result.page === page ? result.products : [];
    }
    case "search": {
      const result = await searchProducts({ q: source.q, filters: source.filters, page });
      return result.page === page ? result.products : [];
    }
    case "collection": {
      const result = await getCollectionPage(source.slug, page, 1, source.filters);
      return result.page === page ? result.products : [];
    }
    case "campaign": {
      const landing = await getCampaignLanding(normalizeSlugParam(source.slug), page, new Date(), 1, source.filters);
      if (!landing || landing.state !== "live") return null;
      return landing.page === page ? landing.products : [];
    }
  }
}

/**
 * Continues an infinite-scroll product list (pages 2..5; page 1 and the
 * numbered-pagination zone are rendered by the pages themselves). The source
 * is re-validated here and results come from the same queries the pages use,
 * so prices/stock/campaign discounts are server-computed exactly as on first
 * render. Returns ready-rendered cards, keeping `ProductCard` a server component.
 */
export async function loadMoreProducts(input: unknown): Promise<LoadMoreResult> {
  const parsed = loadMoreInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "درخواست نامعتبر است." };

  const limited = await checkIpRateLimit("load-more-products", 120, 60 * 1000);
  if (limited) return { ok: false, error: limited.error };

  const { source, page } = parsed.data;
  try {
    const items = await fetchPage(source, page);
    if (items === null) return { ok: false, error: "این فهرست در دسترس نیست." };
    return {
      ok: true,
      page,
      count: items.length,
      cards: items.map((product) => <ProductCard key={product.id} product={product} />),
    };
  } catch (error) {
    console.error("[load-more-products] failed", error);
    return { ok: false, error: "بارگذاری محصولات بیشتر انجام نشد." };
  }
}
