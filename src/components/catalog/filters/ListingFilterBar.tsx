"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ListingFacets } from "@/domains/catalog/listing-engine";
import {
  buildListingHref,
  countActiveFilters,
  hasPriceFilter,
  type ListingFilters,
} from "@/domains/catalog/listing-filters";
import { PRODUCT_SORT_OPTIONS, type ProductSort } from "@/domains/catalog/presentation";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { FilterDropdown } from "./FilterDropdown";
import { MultiSelectPanel } from "./MultiSelectPanel";
import { PriceRangePanel } from "./PriceRangePanel";

type PanelId = "sort" | "brand" | "price" | "category" | "size" | "color";

/**
 * The filter row of every product list page: sort, brand, price, category,
 * size, colour (dropdowns) and an "available only" switch.
 *
 * Every change is just navigation to a new shareable URL
 * (`buildListingHref`) — the server re-reads the filters from the URL,
 * re-validates them and renders the list; nothing here decides what a product
 * costs or whether it is in stock. Applying a filter drops `?page=` so the
 * list restarts from page 1.
 */
export function ListingFilterBar({
  basePath,
  q,
  filters,
  defaultSort,
  facets,
}: {
  basePath: string;
  /** Search page only: the query, kept in every generated URL. */
  q?: string;
  filters: ListingFilters;
  defaultSort: ProductSort;
  facets: ListingFacets;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();

  const navigate = (next: ListingFilters) => {
    setOpenPanel(null);
    startTransition(() => {
      router.push(buildListingHref(basePath, next, { defaultSort, q }), { scroll: false });
    });
  };

  // Escape closes the open panel and returns focus to its button; a click or
  // tap outside the bar closes it too.
  useEffect(() => {
    if (!openPanel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenPanel(null);
      rootRef.current?.querySelector<HTMLElement>('[aria-expanded="true"]')?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpenPanel(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openPanel]);

  const dropdown = (panel: PanelId) => ({
    id: `${idPrefix}-${panel}`,
    open: openPanel === panel,
    onToggle: () => setOpenPanel((current) => (current === panel ? null : panel)),
    onClose: () => setOpenPanel(null),
  });

  const currentSort = filters.sort ?? defaultSort;
  const currentSortLabel = PRODUCT_SORT_OPTIONS.find((option) => option.value === currentSort)?.label;

  // A dropdown with a single choice filters nothing — hide it, unless a value
  // is already selected (so a stale/shared link can still be cleared).
  const showBrands = facets.brands.length >= 2 || filters.brands.length > 0;
  const showCategories = facets.categories.length >= 2 || filters.categories.length > 0;
  const showSizes = facets.sizes.length >= 2 || filters.sizes.length > 0;
  const showColors = facets.colors.length >= 2 || filters.colors.length > 0;
  const showPrice = (facets.price !== null && facets.price.min < facets.price.max) || hasPriceFilter(filters);

  const activeGroups = countActiveFilters(filters);
  const priceActive = hasPriceFilter(filters) ? 1 : 0;

  return (
    <div ref={rootRef} className="relative mb-7" aria-busy={pending}>
      <div role="group" aria-label="فیلتر و مرتب‌سازی محصولات" className="flex flex-wrap items-center gap-2.5">
        <FilterDropdown {...dropdown("sort")} label="مرتب‌سازی:" valueLabel={currentSortLabel}>
          <fieldset className="m-0 border-0 p-0">
            <legend className="sr-only">مرتب‌سازی محصولات</legend>
            <div className="flex flex-col gap-0.5">
              {PRODUCT_SORT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-[0.9rem] hover:bg-card-image"
                >
                  <input
                    type="radio"
                    name={`${idPrefix}-sort`}
                    value={option.value}
                    checked={currentSort === option.value}
                    onChange={() => navigate({ ...filters, sort: option.value })}
                    className="h-4 w-4 shrink-0 accent-ink"
                  />
                  <span className={currentSort === option.value ? "font-semibold text-ink" : "text-ink"}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </FilterDropdown>

        {showBrands && (
          <FilterDropdown {...dropdown("brand")} label="برند" activeCount={filters.brands.length}>
            <MultiSelectPanel
              searchable
              searchLabel="جستجوی برند"
              options={facets.brands.map((brand) => ({
                value: brand.slug,
                label: brand.name,
                hint: brand.nameEn,
              }))}
              selected={filters.brands}
              onApply={(brands) => navigate({ ...filters, brands })}
            />
          </FilterDropdown>
        )}

        {showPrice && (
          <FilterDropdown {...dropdown("price")} label="قیمت" activeCount={priceActive}>
            <PriceRangePanel
              // Re-mount when the applied range changes (e.g. after "clear all").
              key={`${filters.priceMin ?? ""}-${filters.priceMax ?? ""}`}
              bounds={facets.price ?? { min: filters.priceMin ?? 0, max: filters.priceMax ?? filters.priceMin ?? 0 }}
              priceMin={filters.priceMin}
              priceMax={filters.priceMax}
              onApply={(range) => navigate({ ...filters, ...range })}
            />
          </FilterDropdown>
        )}

        {showCategories && (
          <FilterDropdown {...dropdown("category")} label="دسته‌بندی" activeCount={filters.categories.length}>
            <MultiSelectPanel
              searchable={facets.categories.length > 8}
              searchLabel="جستجوی دسته‌بندی"
              options={facets.categories.map((category) => ({ value: category.slug, label: category.name }))}
              selected={filters.categories}
              onApply={(categories) => navigate({ ...filters, categories })}
            />
          </FilterDropdown>
        )}

        {showSizes && (
          <FilterDropdown {...dropdown("size")} label="سایز" activeCount={filters.sizes.length}>
            <MultiSelectPanel
              options={facets.sizes.map((size) => ({ value: size, label: size }))}
              selected={filters.sizes}
              displayValue={toPersianDigits}
              onApply={(sizes) => navigate({ ...filters, sizes })}
            />
          </FilterDropdown>
        )}

        {showColors && (
          <FilterDropdown {...dropdown("color")} label="رنگ" activeCount={filters.colors.length}>
            <MultiSelectPanel
              options={facets.colors.map(({ color, colorHex }) => ({ value: color, label: color, swatch: colorHex }))}
              selected={filters.colors}
              onApply={(colors) => navigate({ ...filters, colors })}
            />
          </FilterDropdown>
        )}

        <label className="flex cursor-pointer items-center gap-2.5 ps-1 text-[0.88rem] text-ink">
          <button
            type="button"
            role="switch"
            aria-checked={filters.availableOnly}
            onClick={() => navigate({ ...filters, availableOnly: !filters.availableOnly })}
            className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
              filters.availableOnly ? "bg-brand" : "bg-ink/20"
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                filters.availableOnly ? "ltr:translate-x-5 rtl:-translate-x-5" : ""
              }`}
            />
            <span className="sr-only">فقط کالاهای موجود</span>
          </button>
          <span aria-hidden="true">فقط کالاهای موجود</span>
        </label>

        {activeGroups > 0 && (
          <button
            type="button"
            onClick={() => navigate({ ...filters, brands: [], categories: [], sizes: [], colors: [], priceMin: undefined, priceMax: undefined, availableOnly: false })}
            className="text-[0.85rem] text-text-secondary underline underline-offset-4 hover:text-ink"
          >
            حذف همه فیلترها
          </button>
        )}

        <span role="status" aria-live="polite" className="text-[0.82rem] text-text-secondary">
          {pending ? "در حال به‌روزرسانی…" : ""}
        </span>
      </div>
    </div>
  );
}
