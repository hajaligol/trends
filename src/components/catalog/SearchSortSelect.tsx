import Link from "next/link";
import {
  PRODUCT_SORT_OPTIONS,
  buildSearchHref,
  type SearchQueryState,
} from "@/domains/catalog/presentation";

export function SearchSortSelect({ state }: { state: SearchQueryState }) {
  const current = state.sort ?? "newest";
  return (
    <div className="flex flex-wrap items-center gap-2 text-[0.88rem]">
      <span className="text-text-secondary">مرتب‌سازی:</span>
      {PRODUCT_SORT_OPTIONS.map((option, index) => {
        const isCurrent = option.value === current;
        return (
          <span key={option.value} className="flex items-center gap-2">
            <Link
              href={buildSearchHref({ ...state, sort: option.value, page: undefined })}
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
