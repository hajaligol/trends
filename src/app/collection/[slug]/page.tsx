import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductListing } from "@/components/catalog/ProductListing";
import { CollectionPagination } from "@/components/catalog/CollectionPagination";
import { getCollectionPage } from "@/domains/catalog/collection-listing";
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
  return { slug, requestedPage };
}

export async function generateMetadata(props: CollectionPageProps): Promise<Metadata> {
  const { slug, requestedPage } = await resolve(props);
  const collection = COLLECTIONS[slug];
  const canonicalPath = `/collection/${slug}`;
  return {
    title: collection.title,
    description: collection.description,
    alternates: { canonical: canonicalPath },
    openGraph: { url: canonicalPath },
    robots: requestedPage > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function CollectionPage(props: CollectionPageProps) {
  const { slug, requestedPage } = await resolve(props);
  const collection = COLLECTIONS[slug];
  const window = listingWindowFor(requestedPage);
  const result = await getCollectionPage(slug, window.fetchPage, window.pageSpan);
  const { products, total, totalPages } = result;
  const baseHref = `/collection/${slug}`;
  const progress = listingProgress(window, requestedPage, totalPages, result.page);
  if (progress.clampedIntoInfiniteZone) redirect(`${baseHref}?page=${result.page}`);

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

        <ProductListing
          products={products}
          emptyMessage="هنوز محصولی در این بخش وجود ندارد."
          total={total}
          totalPages={totalPages}
          infinite={window.infinite}
          loadedThrough={progress.loadedThrough}
          source={{ kind: "collection", slug }}
          baseHref={baseHref}
          pagination={(current) => <CollectionPagination basePath={baseHref} page={current} totalPages={totalPages} />}
        />
      </Container>
    </main>
  );
}
