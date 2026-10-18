import Link from "next/link";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/** Numbered pagination made of real links (works without JS and is crawlable). `hrefFor(1)` is the clean first-page URL. */
export function BlogPagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null;

  // 1 … (page-1) page (page+1) … last
  const shown = new Set([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
  const numbers = [...shown].sort((a, b) => a - b);

  const base = "grid h-10 min-w-10 place-items-center rounded-full px-3 text-[0.92rem] font-semibold transition-colors";

  return (
    <nav aria-label="صفحه‌بندی مقالات" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${base} border border-line bg-white text-ink hover:bg-ink/5`}>
          قبلی
        </Link>
      )}
      {numbers.map((number, index) => {
        const previous = numbers[index - 1];
        return (
          <span key={number} className="flex items-center gap-2">
            {previous !== undefined && number - previous > 1 && <span aria-hidden="true" className="text-text-secondary">…</span>}
            {number === page ? (
              <span aria-current="page" className={`${base} bg-ink text-white`}>
                {toPersianDigits(number)}
              </span>
            ) : (
              <Link href={hrefFor(number)} aria-label={`صفحه ${toPersianDigits(number)}`} className={`${base} border border-line bg-white text-ink hover:bg-ink/5`}>
                {toPersianDigits(number)}
              </Link>
            )}
          </span>
        );
      })}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} rel="next" className={`${base} border border-line bg-white text-ink hover:bg-ink/5`}>
          بعدی
        </Link>
      )}
    </nav>
  );
}
