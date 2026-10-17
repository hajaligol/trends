import { cache } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductListing } from "@/components/catalog/ProductListing";
import { ListingFilterBar } from "@/components/catalog/filters/ListingFilterBar";
import { ListingPagination } from "@/components/catalog/ListingPagination";
import { searchProducts } from "@/domains/catalog/queries";
import {
  buildListingHref,
  countActiveFilters,
  parseListingFilters,
  type ListingFilters,
} from "@/domains/catalog/listing-filters";
import { DEFAULT_PRODUCT_SORT, listingProgress, listingWindowFor } from "@/domains/catalog/presentation";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `cache()`'d so `generateMetadata` and the page body share one fetch. */
const loadSearchResults = cache((q: string, filtersJson: string, page: number, pageSpan: number) =>
  searchProducts({ q, filters: JSON.parse(filtersJson) as ListingFilters, page, pageSpan }),
);

async function resolveQueryState(props: SearchPageProps) {
  const searchParams = await props.searchParams;
  const q = firstValue(searchParams.q)?.trim() ?? "";

  const filters = parseListingFilters(searchParams);

  const pageParam = firstValue(searchParams.page);
  const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return { q, filters, filtersJson: JSON.stringify(filters), page };
}

export async function generateMetadata(props: SearchPageProps): Promise<Metadata> {
  const { q } = await resolveQueryState(props);
  return {
    title: q ? `جستجو: ${q}` : "جستجو",
    // Search results pages are near-duplicate content that shifts with
    // every query string — keep them out of the index (TRENDS_PROJECT_CONTEXT.md
    // §8 "no accidental indexing" applies just as much to search result
    // pages as to admin/account pages).
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage(props: SearchPageProps) {
  const { q, filters, filtersJson, page } = await resolveQueryState(props);
  const window = listingWindowFor(page);
  const result = q ? await loadSearchResults(q, filtersJson, window.fetchPage, window.pageSpan) : null;
  const progress = result ? listingProgress(window, page, result.totalPages, result.page) : null;
  if (result && progress?.clampedIntoInfiniteZone) {
    redirect(buildListingHref("/search", filters, { q, page: result.page }));
  }
  // The filter bar stays visible while a filter yields nothing (so it can be undone).
  const showFilterBar = result !== null && (result.total > 0 || countActiveFilters(filters) > 0);

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <Breadcrumbs items={[{ label: "صفحه اصلی", href: "/" }, { label: "جستجو" }]} />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-[clamp(1.5rem,3vw,2.1rem)] font-bold">
              {q ? `نتایج جستجو برای «${q}»` : "جستجو"}
            </h1>
            {result && result.total > 0 && (
              <p className="mt-1.5 text-[0.88rem] text-text-secondary">
                {toPersianDigits(result.total)} محصول پیدا شد
              </p>
            )}
          </div>
        </div>

        {result && showFilterBar && (
          <ListingFilterBar basePath="/search" q={q} filters={filters} defaultSort={DEFAULT_PRODUCT_SORT} facets={result.facets} />
        )}

        {!q ? (
          <p className="rounded-[14px] bg-card-image px-6 py-16 text-center text-[0.95rem] text-text-secondary">
            عبارتی برای جستجو وارد کنید.
          </p>
        ) : (
          <>
            <ProductListing
              products={result?.products ?? []}
              emptyMessage={`محصولی برای «${q}» پیدا نشد.`}
              total={result?.total ?? 0}
              totalPages={result?.totalPages ?? 0}
              infinite={window.infinite}
              loadedThrough={progress?.loadedThrough ?? 1}
              source={{ kind: "search", q, filters }}
              baseHref={buildListingHref("/search", filters, { q })}
              pagination={(current) => (
                <ListingPagination
                  basePath="/search"
                  q={q}
                  filters={filters}
                  defaultSort={DEFAULT_PRODUCT_SORT}
                  page={current}
                  totalPages={result?.totalPages ?? 0}
                />
              )}
            />
          </>
        )}
      </Container>
    </main>
  );
}
