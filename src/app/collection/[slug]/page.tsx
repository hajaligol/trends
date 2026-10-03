import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { CollectionPagination } from "@/components/catalog/CollectionPagination";
import { COLLECTIONS, isCollectionSlug, type CollectionSlug } from "@/domains/catalog/presentation";
import { getFeaturedProducts, getNewArrivals, getTopSellingProducts } from "@/domains/catalog/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const COLLECTION_PAGE_SIZE = 12;

const loadCollection = cache((slug: CollectionSlug) => {
  if (slug === "featured") return getFeaturedProducts();
  if (slug === "top-selling") return getTopSellingProducts();
  return getNewArrivals();
});

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
  const all = await loadCollection(slug);

  // Paginated in application code after one batched fetch — the same
  // documented tradeoff as category/search pages (fine at this catalog size).
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / COLLECTION_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * COLLECTION_PAGE_SIZE;
  const pageItems = all.slice(start, start + COLLECTION_PAGE_SIZE);

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

        <ProductGrid products={pageItems} emptyMessage="هنوز محصولی در این بخش وجود ندارد." />

        <CollectionPagination basePath={`/collection/${slug}`} page={page} totalPages={totalPages} />
      </Container>
    </main>
  );
}
