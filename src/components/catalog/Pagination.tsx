import Link from "next/link";
import { buildCategoryHref, type CategoryQueryState } from "@/domains/catalog/presentation";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export function Pagination({
  slug,
  state,
  page,
  totalPages,
}: {
  slug: string;
  state: CategoryQueryState;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="صفحه‌بندی" className="mt-10 flex items-center justify-center gap-2">
      <Link
        href={buildCategoryHref(slug, { ...state, page: Math.max(1, page - 1) })}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={`rounded-full border px-3 py-1.5 text-[0.85rem] ${
          page <= 1
            ? "pointer-events-none border-line text-text-secondary/50"
            : "border-line text-ink hover:border-ink"
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
                href={buildCategoryHref(slug, { ...state, page: pageNumber })}
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
        href={buildCategoryHref(slug, { ...state, page: Math.min(totalPages, page + 1) })}
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
