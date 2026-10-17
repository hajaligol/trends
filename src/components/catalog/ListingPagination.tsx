import Link from "next/link";
import { buildListingHref, type ListingFilters } from "@/domains/catalog/listing-filters";
import type { ProductSort } from "@/domains/catalog/presentation";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * Numbered pagination for every list page (it takes over once infinite scroll
 * has loaded its pages). Every link keeps the active filters, sort and — on
 * the search page — the query.
 */
export function ListingPagination({
  basePath,
  filters,
  defaultSort,
  q,
  page,
  totalPages,
}: {
  basePath: string;
  filters: ListingFilters;
  defaultSort: ProductSort;
  q?: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => buildListingHref(basePath, filters, { defaultSort, q, page: target });
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="صفحه‌بندی" className="mt-10 flex items-center justify-center gap-2">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={`rounded-full border px-3 py-1.5 text-[0.85rem] ${
          page <= 1 ? "pointer-events-none border-line text-text-secondary/50" : "border-line text-ink hover:border-ink"
        }`}
      >
        قبلی
      </Link>
      <ul className="flex items-center gap-1.5">
        {pages.map((pageNumber) => {
          const isCurrent = pageNumber === page;
          return (
            <li key={pageNumber}>
              <Link
                href={hrefFor(pageNumber)}
                aria-current={isCurrent ? "page" : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.85rem] ${
                  isCurrent ? "bg-ink text-white" : "text-text-secondary hover:bg-card-image"
                }`}
              >
                {toPersianDigits(pageNumber)}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
        className={`rounded-full border px-3 py-1.5 text-[0.85rem] ${
          page >= totalPages
            ? "pointer-events-none border-line text-text-secondary/50"
            : "border-line text-ink hover:border-ink"
        }`}
      >
        بعدی
      </Link>
    </nav>
  );
}
