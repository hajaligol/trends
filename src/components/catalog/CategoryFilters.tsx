import Link from "next/link";
import { buildCategoryHref, type CategoryQueryState } from "@/domains/catalog/presentation";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * Single-select size/color filters (one active size, one active color at
 * a time) rather than multi-select checkboxes — the catalog is small
 * enough right now that this covers the common "show me size M" /
 * "show me black items" cases without the extra UI/query complexity of
 * combining multiple selected sizes or colors. Revisit if a category
 * grows large enough that shoppers need to narrow by more than one size
 * or color at once.
 */
export function CategoryFilters({
  slug,
  state,
  availableSizes,
  availableColors,
}: {
  slug: string;
  state: CategoryQueryState;
  availableSizes: string[];
  availableColors: Array<{ color: string; colorHex: string | null }>;
}) {
  if (availableSizes.length === 0 && availableColors.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-5">
      {availableSizes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="ms-1 text-[0.85rem] text-text-secondary">سایز:</span>
          {availableSizes.map((size) => {
            const isActive = state.size === size;
            return (
              <Link
                key={size}
                href={buildCategoryHref(slug, {
                  ...state,
                  size: isActive ? undefined : size,
                  page: undefined,
                })}
                aria-current={isActive ? "true" : undefined}
                className={`rounded-full border px-3 py-1 text-[0.82rem] ${
                  isActive ? "border-ink bg-ink text-white" : "border-line text-text-secondary hover:border-ink"
                }`}
              >
                {toPersianDigits(size)}
              </Link>
            );
          })}
        </div>
      )}
      {availableColors.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="ms-1 text-[0.85rem] text-text-secondary">رنگ:</span>
          {availableColors.map(({ color, colorHex }) => {
            const isActive = state.color === color;
            return (
              <Link
                key={color}
                href={buildCategoryHref(slug, {
                  ...state,
                  color: isActive ? undefined : color,
                  page: undefined,
                })}
                aria-current={isActive ? "true" : undefined}
                title={color}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.82rem] ${
                  isActive ? "border-ink text-ink" : "border-line text-text-secondary hover:border-ink"
                }`}
              >
                {colorHex && (
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: colorHex }}
                    className="h-2.5 w-2.5 rounded-full border border-ink/15"
                  />
                )}
                {color}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
