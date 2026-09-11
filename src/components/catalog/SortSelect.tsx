import Link from "next/link";
import {
  PRODUCT_SORT_OPTIONS,
  buildCategoryHref,
  type CategoryQueryState,
} from "@/domains/catalog/presentation";

/**
 * Plain links, not a `<select>` + client-side `onChange` — toggling sort
 * is just navigation to a different URL, so a Server Component with
 * `next/link` does the job with zero client JS and works even before
 * hydration (rule F.7, "prefer progressive enhancement").
 */
export function SortSelect({ slug, state }: { slug: string; state: CategoryQueryState }) {
  const current = state.sort ?? "newest";
  return (
    <div className="flex flex-wrap items-center gap-2 text-[0.88rem]">
      <span className="text-text-secondary">مرتب‌سازی:</span>
      {PRODUCT_SORT_OPTIONS.map((option, index) => {
        const isCurrent = option.value === current;
        return (
          <span key={option.value} className="flex items-center gap-2">
            <Link
              href={buildCategoryHref(slug, { ...state, sort: option.value, page: undefined })}
              aria-current={isCurrent ? "true" : undefined}
              className={isCurrent ? "font-semibold text-ink" : "text-text-secondary hover:text-ink"}
            >
              {option.label}
            </Link>
            {index < PRODUCT_SORT_OPTIONS.length - 1 && (
              <span aria-hidden="true" className="text-line">
                ·
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
