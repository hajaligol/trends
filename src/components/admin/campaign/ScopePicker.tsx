"use client";

import { useEffect, useMemo, useState } from "react";
import type { PickerBrand, PickerCategory, PickerProduct } from "@/domains/campaigns/admin-queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { CloseIcon, SearchIcon } from "@/components/admin/ui/icons";
import { ADMIN_CONTROL } from "@/components/admin/ui/layout";

export type Scope = {
  appliesToAll: boolean;
  brandIds: string[];
  categoryIds: string[];
  products: PickerProduct[];
  excludedProducts: PickerProduct[];
};

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function Count({ n }: { n: number }) {
  return n > 0 ? (
    <span className="rounded-full bg-brand px-2 py-0.5 text-[0.7rem] font-semibold text-white">{toPersianDigits(n)}</span>
  ) : null;
}

export function ScopePicker({
  scope,
  onChange,
  brands,
  categories,
}: {
  scope: Scope;
  onChange: (patch: Partial<Scope>) => void;
  brands: PickerBrand[];
  categories: PickerCategory[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="m-0 grid min-w-0 gap-2.5 border-0 p-0 sm:grid-cols-2">
        <legend className="sr-only">دامنه کمپین</legend>
        {[
          { all: true, title: "کل فروشگاه", text: "کمپین روی همه محصولات اعمال می‌شود." },
          { all: false, title: "فقط موارد انتخابی", text: "برند، دسته‌بندی یا محصولات مشخص." },
        ].map((option) => (
          <label
            key={String(option.all)}
            className={`flex cursor-pointer flex-col gap-0.5 rounded-[var(--radius-md)] border p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand/50 ${
              scope.appliesToAll === option.all ? "border-brand bg-lavender/30 shadow-[0_0_0_1px_var(--color-brand)]" : "border-line bg-white hover:border-ink/30"
            }`}
          >
            <input
              type="radio"
              name="campaign-scope"
              className="sr-only"
              checked={scope.appliesToAll === option.all}
              onChange={() => onChange({ appliesToAll: option.all })}
            />
            <span className="text-[0.9rem] font-semibold text-ink">{option.title}</span>
            <span className="text-[0.76rem] leading-5 text-text-secondary">{option.text}</span>
          </label>
        ))}
      </fieldset>

      {!scope.appliesToAll && (
        <div className="flex flex-col gap-5">
          <p className="m-0 rounded-[var(--radius-md)] bg-header-bg px-3.5 py-2.5 text-[0.78rem] leading-6 text-text-secondary">
            هر محصولی که <b className="text-ink">در یکی از موارد زیر</b> باشد مشمول کمپین است (برند «یا» دسته‌بندی «یا» محصول).
          </p>
          <BrandList brands={brands} selected={scope.brandIds} onToggle={(id) => onChange({ brandIds: toggle(scope.brandIds, id) })} />
          <CategoryList
            categories={categories}
            selected={scope.categoryIds}
            onToggle={(id) => onChange({ categoryIds: toggle(scope.categoryIds, id) })}
          />
          <div className="flex flex-col gap-2">
            <h3 className="m-0 flex items-center gap-2 text-[0.88rem] font-semibold text-ink">
              محصولات مشخص <Count n={scope.products.length} />
            </h3>
            <ProductSearch selected={scope.products} onChange={(products) => onChange({ products })} placeholder="نام یا کد محصول را جستجو کنید…" />
          </div>
        </div>
      )}

      <details className="rounded-[var(--radius-md)] border border-line bg-white open:bg-header-bg/40" open={scope.excludedProducts.length > 0}>
        <summary className="flex cursor-pointer items-center gap-2 px-3.5 py-3 text-[0.86rem] font-medium text-ink">
          استثنا: محصولاتی که شامل کمپین نشوند <Count n={scope.excludedProducts.length} />
        </summary>
        <div className="px-3.5 pb-3.5">
          <ProductSearch
            selected={scope.excludedProducts}
            onChange={(excludedProducts) => onChange({ excludedProducts })}
            placeholder="محصول مستثنی را جستجو کنید…"
          />
        </div>
      </details>
    </div>
  );
}

function BrandList({ brands, selected, onToggle }: { brands: PickerBrand[]; selected: string[]; onToggle: (id: string) => void }) {
  const [filter, setFilter] = useState("");
  const shown = brands.filter((b) => b.name.toLowerCase().includes(filter.trim().toLowerCase()));
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 flex items-center gap-2 text-[0.88rem] font-semibold text-ink">
        برندها <Count n={selected.length} />
      </h3>
      {brands.length === 0 ? (
        <p className="m-0 text-[0.8rem] text-text-secondary">هنوز برندی ثبت نشده است.</p>
      ) : (
        <>
          {brands.length > 8 && (
            <input
              type="search"
              aria-label="جستجوی برند"
              placeholder="جستجوی برند…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className={ADMIN_CONTROL}
            />
          )}
          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-[var(--radius-md)] border border-line bg-white p-2.5">
            {shown.map((brand) => {
              const on = selected.includes(brand.id);
              return (
                <label
                  key={brand.id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand/50 ${
                    on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-ink/30"
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => onToggle(brand.id)} />
                  {brand.name}
                  {!brand.isActive && <span className="text-[0.68rem] opacity-70">(غیرفعال)</span>}
                </label>
              );
            })}
            {shown.length === 0 && <span className="text-[0.8rem] text-text-secondary">برندی یافت نشد.</span>}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryList({ categories, selected, onToggle }: { categories: PickerCategory[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 flex items-center gap-2 text-[0.88rem] font-semibold text-ink">
        دسته‌بندی‌ها <Count n={selected.length} />
      </h3>
      <p className="m-0 text-[0.76rem] leading-5 text-text-secondary">انتخاب یک دسته، همه زیرمجموعه‌هایش را هم شامل می‌شود.</p>
      <div className="max-h-56 overflow-y-auto rounded-[var(--radius-md)] border border-line bg-white p-1.5">
        {categories.map((category) => {
          const on = selected.includes(category.id);
          return (
            <label
              key={category.id}
              style={{ paddingInlineStart: `${0.6 + category.depth * 1.25}rem` }}
              className={`flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] py-1.5 pe-3 text-[0.84rem] hover:bg-header-bg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand/50 ${
                category.depth === 0 ? "font-semibold" : ""
              }`}
            >
              <input type="checkbox" checked={on} onChange={() => onToggle(category.id)} className="h-4 w-4 accent-[var(--color-brand)]" />
              {category.name}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ProductSearch({
  selected,
  onChange,
  placeholder,
}: {
  selected: PickerProduct[];
  onChange: (products: PickerProduct[]) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  // Results are stored with the query they answer; a mismatch means "still loading".
  const [answer, setAnswer] = useState<{ q: string; products: PickerProduct[] } | null>(null);
  const q = query.trim();
  const searching = q.length >= 2;
  const loading = searching && answer?.q !== q;
  const results = searching && answer?.q === q ? answer.products : [];

  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let products: PickerProduct[] = [];
      try {
        const response = await fetch(`/api/admin/campaign-products?q=${encodeURIComponent(q)}`);
        products = ((await response.json()) as { products?: PickerProduct[] }).products ?? [];
      } catch {
        products = [];
      }
      if (!cancelled) setAnswer({ q, products });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);
  const available = results.filter((p) => !selectedIds.has(p.id));

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative">
        <SearchIcon width={17} height={17} className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-text-secondary" />
        <input
          type="search"
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={`${ADMIN_CONTROL} ps-10`}
        />
      </div>
      {searching && (
        <ul className="m-0 flex max-h-52 list-none flex-col overflow-y-auto rounded-[var(--radius-md)] border border-line bg-white p-1" aria-live="polite">
          {loading && <li className="px-3 py-2 text-[0.8rem] text-text-secondary">در حال جستجو…</li>}
          {!loading && available.length === 0 && <li className="px-3 py-2 text-[0.8rem] text-text-secondary">محصول جدیدی یافت نشد.</li>}
          {available.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...selected, product]);
                  setQuery("");
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] border-0 bg-transparent px-3 py-2 text-start text-[0.84rem] text-ink hover:bg-header-bg"
              >
                <span className="truncate">{product.title}</span>
                <span className="shrink-0 text-[0.72rem] text-text-secondary">کد {toPersianDigits(product.productCode)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {selected.map((product) => (
            <li key={product.id} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 ps-3 pe-1 text-[0.8rem] text-ink">
              <span className="max-w-[16rem] truncate">{product.title}</span>
              <button
                type="button"
                aria-label={`حذف ${product.title}`}
                onClick={() => onChange(selected.filter((p) => p.id !== product.id))}
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-full border-0 bg-ink/[0.06] text-ink hover:bg-ink/15"
              >
                <CloseIcon width={13} height={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
