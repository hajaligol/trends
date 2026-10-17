import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductListing } from "@/components/catalog/ProductListing";
import { ListingFilterBar } from "@/components/catalog/filters/ListingFilterBar";
import { ListingPagination } from "@/components/catalog/ListingPagination";
import { SubcategoryNav } from "@/components/catalog/SubcategoryNav";
import { getProductsByCategorySlug } from "@/domains/catalog/queries";
import {
  buildListingHref,
  countActiveFilters,
  isDefaultListing,
  parseListingFilters,
  type ListingFilters,
} from "@/domains/catalog/listing-filters";
import { DEFAULT_PRODUCT_SORT, listingProgress, listingWindowFor } from "@/domains/catalog/presentation";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * `cache()`'d on primitive args (not the raw `props` object) so
 * `generateMetadata` and the page body — which both need this same
 * query for one request — share a single DB round trip instead of
 * fetching it twice. The filters travel as a JSON string for the same reason.
 */
const loadCategoryProducts = cache((slug: string, filtersJson: string, page: number, pageSpan: number) =>
  getProductsByCategorySlug({ slug, filters: JSON.parse(filtersJson) as ListingFilters, page, pageSpan }),
);

async function resolveQueryState(props: CategoryPageProps) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const filters = parseListingFilters(searchParams);

  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return { slug, filters, filtersJson: JSON.stringify(filters), page, window: listingWindowFor(page) };
}

export async function generateMetadata(props: CategoryPageProps): Promise<Metadata> {
  const { slug, filters, filtersJson, page, window } = await resolveQueryState(props);
  const result = await loadCategoryProducts(slug, filtersJson, window.fetchPage, window.pageSpan);
  if (!result) return { title: "دسته‌بندی پیدا نشد" };

  const canonicalPath = `/category/${slug}`;

  return {
    title: result.category.name,
    description: result.category.description ?? `محصولات دسته «${result.category.name}» در ترندز`,
    alternates: { canonical: canonicalPath },
    openGraph: { url: canonicalPath },
    // Filtered/sorted URLs and page > 1 are near-duplicate content that shifts
    // with query params — keep only the clean category URL indexable, per
    // TRENDS_PROJECT_CONTEXT.md §8's "no accidental indexing".
    robots: !isDefaultListing(filters) || page > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage(props: CategoryPageProps) {
  const { slug, filters, filtersJson, page, window } = await resolveQueryState(props);
  const result = await loadCategoryProducts(slug, filtersJson, window.fetchPage, window.pageSpan);
  if (!result) notFound();

  const { category, products, total, totalPages, facets } = result;
  const basePath = `/category/${slug}`;
  const progress = listingProgress(window, page, totalPages, result.page);
  if (progress.clampedIntoInfiniteZone) {
    redirect(buildListingHref(basePath, filters, { defaultSort: DEFAULT_PRODUCT_SORT, page: result.page }));
  }
  const showFilterBar = total > 0 || countActiveFilters(filters) > 0;

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <Breadcrumbs
          items={[
            { label: "صفحه اصلی", href: "/" },
            ...category.trail.map((ancestor) => ({ label: ancestor.name, href: `/category/${ancestor.slug}` })),
            { label: category.name },
          ]}
        />

        <div className="mb-6">
          <h1 className="m-0 text-[clamp(1.5rem,3vw,2.1rem)] font-bold">{category.name}</h1>
          {category.description && (
            <p className="mt-1.5 max-w-prose text-[0.92rem] text-text-secondary">{category.description}</p>
          )}
        </div>

        <SubcategoryNav category={category} />

        {showFilterBar && (
          <ListingFilterBar basePath={basePath} filters={filters} defaultSort={DEFAULT_PRODUCT_SORT} facets={facets} />
        )}

        <ProductListing
          products={products}
          emptyMessage="محصولی با این مشخصات در این دسته پیدا نشد."
          total={total}
          totalPages={totalPages}
          infinite={window.infinite}
          loadedThrough={progress.loadedThrough}
          source={{ kind: "category", slug, filters }}
          baseHref={buildListingHref(basePath, filters)}
          showCount
          pagination={(current) => (
            <ListingPagination
              basePath={basePath}
              filters={filters}
              defaultSort={DEFAULT_PRODUCT_SORT}
              page={current}
              totalPages={totalPages}
            />
          )}
        />
      </Container>
    </main>
  );
}
