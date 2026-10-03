import Link from "next/link";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/** Prev/numbered/next links for `/collection/[slug]?page=N`. Same look as
 * the category and search paginations. */
export function CollectionPagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => (target > 1 ? `${basePath}?page=${target}` : basePath);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  return (
    <nav aria-label="صفحه‌بندی" className="mt-10 flex items-center justify-center gap-2">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={atStart}
        tabIndex={atStart ? -1 : undefined}
        className={`rounded-full border px-3 py-1.5 text-[0.85rem] ${
          atStart ? "pointer-events-none border-line text-text-secondary/50" : "border-line text-ink hover:border-ink"
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
        aria-disabled={atEnd}
        tabIndex={atEnd ? -1 : undefined}
        className={`rounded-full border px-3 py-1.5 text-[0.85rem] ${
          atEnd ? "pointer-events-none border-line text-text-secondary/50" : "border-line text-ink hover:border-ink"
        }`}
      >
        بعدی
      </Link>
    </nav>
  );
}
