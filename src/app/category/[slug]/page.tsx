import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { SortSelect } from "@/components/catalog/SortSelect";
import { CategoryFilters } from "@/components/catalog/CategoryFilters";
import { Pagination } from "@/components/catalog/Pagination";
import { getProductsByCategorySlug } from "@/domains/catalog/queries";
import { isProductSort, type CategoryQueryState, type ProductSort } from "@/domains/catalog/presentation";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `cache()`'d on primitive args (not the raw `props` object) so
 * `generateMetadata` and the page body — which both need this same
 * query for one request — share a single DB round trip instead of
 * fetching it twice.
 */
const loadCategoryProducts = cache(
  (slug: string, sort: ProductSort | undefined, size: string | undefined, color: string | undefined, page: number) =>
    getProductsByCategorySlug({ slug, sort, size, color, page }),
);

async function resolveQueryState(props: CategoryPageProps) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;

  const sortParam = firstValue(searchParams.sort);
  const sort = sortParam && isProductSort(sortParam) ? sortParam : undefined;
  const size = firstValue(searchParams.size);
  const color = firstValue(searchParams.color);

  const pageParam = firstValue(searchParams.page);
  const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return { slug, sort, size, color, page };
}

export async function generateMetadata(props: CategoryPageProps): Promise<Metadata> {
  const { slug, sort, size, color, page } = await resolveQueryState(props);
  const result = await loadCategoryProducts(slug, sort, size, color, page);
  if (!result) return { title: "دسته‌بندی پیدا نشد" };
  return {
    title: result.category.name,
    description: result.category.description ?? `محصولات دسته «${result.category.name}» در ترندز`,
  };
}

export default async function CategoryPage(props: CategoryPageProps) {
  const { slug, sort, size, color, page } = await resolveQueryState(props);
  const result = await loadCategoryProducts(slug, sort, size, color, page);
  if (!result) notFound();

  const { category, products, total, totalPages, availableSizes, availableColors } = result;
  const state: CategoryQueryState = { sort, size, color };

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <Breadcrumbs items={[{ label: "صفحه اصلی", href: "/" }, { label: category.name }]} />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-[clamp(1.5rem,3vw,2.1rem)] font-bold">{category.name}</h1>
            {category.description && (
              <p className="mt-1.5 max-w-prose text-[0.92rem] text-text-secondary">{category.description}</p>
            )}
          </div>
          <SortSelect slug={slug} state={state} />
        </div>

        <div className="mb-7">
          <CategoryFilters
            slug={slug}
            state={state}
            availableSizes={availableSizes}
            availableColors={availableColors}
          />
        </div>

        <ProductGrid products={products} emptyMessage="محصولی با این مشخصات در این دسته پیدا نشد." />

        <Pagination slug={slug} state={state} page={result.page} totalPages={totalPages} />

        {total > 0 && (
          <p className="mt-4 text-center text-[0.82rem] text-text-secondary">
            نمایش {toPersianDigits(products.length)} محصول از {toPersianDigits(total)} محصول
          </p>
        )}
      </Container>
    </main>
  );
}
