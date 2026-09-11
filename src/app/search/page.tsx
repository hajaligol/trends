import { cache } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { SearchSortSelect } from "@/components/catalog/SearchSortSelect";
import { SearchPagination } from "@/components/catalog/SearchPagination";
import { searchProducts } from "@/domains/catalog/queries";
import { isProductSort, type ProductSort, type SearchQueryState } from "@/domains/catalog/presentation";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `cache()`'d so `generateMetadata` and the page body share one fetch. */
const loadSearchResults = cache((q: string, sort: ProductSort | undefined, page: number) =>
  searchProducts({ q, sort, page }),
);

async function resolveQueryState(props: SearchPageProps) {
  const searchParams = await props.searchParams;
  const q = firstValue(searchParams.q)?.trim() ?? "";

  const sortParam = firstValue(searchParams.sort);
  const sort = sortParam && isProductSort(sortParam) ? sortParam : undefined;

  const pageParam = firstValue(searchParams.page);
  const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return { q, sort, page };
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
  const { q, sort, page } = await resolveQueryState(props);
  const result = q ? await loadSearchResults(q, sort, page) : null;
  const state: SearchQueryState = { q, sort };

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
          {result && result.total > 0 && <SearchSortSelect state={state} />}
        </div>

        {!q ? (
          <p className="rounded-[14px] bg-card-image px-6 py-16 text-center text-[0.95rem] text-text-secondary">
            عبارتی برای جستجو وارد کنید.
          </p>
        ) : (
          <>
            <ProductGrid
              products={result?.products ?? []}
              emptyMessage={`محصولی برای «${q}» پیدا نشد.`}
            />
            {result && (
              <SearchPagination state={state} page={result.page} totalPages={result.totalPages} />
            )}
          </>
        )}
      </Container>
    </main>
  );
}
