import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductListing } from "@/components/catalog/ProductListing";
import { ListingFilterBar } from "@/components/catalog/filters/ListingFilterBar";
import { ListingPagination } from "@/components/catalog/ListingPagination";
import { collectionDefaultSort, getCollectionPage } from "@/domains/catalog/collection-listing";
import {
  buildListingHref,
  countActiveFilters,
  isDefaultListing,
  parseListingFilters,
} from "@/domains/catalog/listing-filters";
import { COLLECTIONS, isCollectionSlug, listingProgress, listingWindowFor } from "@/domains/catalog/presentation";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolve(props: CollectionPageProps) {
  const { slug } = await props.params;
  if (!isCollectionSlug(slug)) notFound();
  const searchParams = await props.searchParams;
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const parsed = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const requestedPage = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return { slug, requestedPage, filters: parseListingFilters(searchParams) };
}

export async function generateMetadata(props: CollectionPageProps): Promise<Metadata> {
  const { slug, requestedPage, filters } = await resolve(props);
  const collection = COLLECTIONS[slug];
  const canonicalPath = `/collection/${slug}`;
  return {
    title: collection.title,
    description: collection.description,
    alternates: { canonical: canonicalPath },
    openGraph: { url: canonicalPath },
    robots:
      requestedPage > 1 || !isDefaultListing(filters, collectionDefaultSort(slug))
        ? { index: false, follow: true }
        : undefined,
  };
}

export default async function CollectionPage(props: CollectionPageProps) {
  const { slug, requestedPage, filters } = await resolve(props);
  const collection = COLLECTIONS[slug];
  const defaultSort = collectionDefaultSort(slug);
  const window = listingWindowFor(requestedPage);
  const result = await getCollectionPage(slug, window.fetchPage, window.pageSpan, filters);
  const { products, total, totalPages, facets } = result;
  const basePath = `/collection/${slug}`;
  const progress = listingProgress(window, requestedPage, totalPages, result.page);
  if (progress.clampedIntoInfiniteZone) redirect(buildListingHref(basePath, filters, { defaultSort, page: result.page }));
  const showFilterBar = total > 0 || countActiveFilters(filters) > 0;

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <Breadcrumbs items={[{ label: "صفحه اصلی", href: "/" }, { label: collection.title }]} />

        <div className="mb-6">
          <h1 className="m-0 text-[clamp(1.5rem,3vw,2.1rem)] font-bold">{collection.title}</h1>
          {total > 0 && (
            <p className="mt-1.5 text-[0.88rem] text-text-secondary">{toPersianDigits(total)} محصول</p>
          )}
        </div>

        {showFilterBar && (
          <ListingFilterBar basePath={basePath} filters={filters} defaultSort={defaultSort} facets={facets} />
        )}

        <ProductListing
          products={products}
          emptyMessage={
            countActiveFilters(filters) > 0 ? "محصولی با این مشخصات پیدا نشد." : "هنوز محصولی در این بخش وجود ندارد."
          }
          total={total}
          totalPages={totalPages}
          infinite={window.infinite}
          loadedThrough={progress.loadedThrough}
          source={{ kind: "collection", slug, filters }}
          baseHref={buildListingHref(basePath, filters, { defaultSort })}
          pagination={(current) => (
            <ListingPagination
              basePath={basePath}
              filters={filters}
              defaultSort={defaultSort}
              page={current}
              totalPages={totalPages}
            />
          )}
        />
      </Container>
    </main>
  );
}
