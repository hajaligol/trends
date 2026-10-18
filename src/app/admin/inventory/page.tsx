import Link from "next/link";
import { listVariantStockForAdmin, type StockState } from "@/domains/catalog/admin-queries";
import { listBrandsForAdmin } from "@/domains/brands/queries";
import { listCategoryOptions } from "@/domains/categories/queries";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";
import { firstParam, normalizeSearchText, type RawParam } from "@/lib/utils/admin-filters";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { buildHref, EmptyState, FilterBar, FilterTabs, PageHeader, Pagination, SearchField, SelectFilter, StatusBadge } from "@/components/admin/ui/layout";
import { CheckCircleIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "موجودی", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STOCK_STATES: StockState[] = ["out", "low", "in"];

/**
 * Every active variant with its stock, lowest first (out-of-stock on top),
 * searchable by product / SKU / size / color / product code and filterable by
 * stock state, brand and category (see `listVariantStockForAdmin`). Each row
 * keeps the inline adjustment form — see `src/domains/inventory/actions.ts`'s
 * header comment for why this is a single audited delta-adjustment rather
 * than a full movement ledger table.
 */
export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: RawParam; stock?: RawParam; brand?: RawParam; category?: RawParam; page?: RawParam }>;
}) {
  const params = await searchParams;
  const q = normalizeSearchText(params.q);
  const stockParam = firstParam(params.stock);
  const stock = STOCK_STATES.find((state) => state === stockParam);
  const brandParam = firstParam(params.brand);
  const brandId = brandParam && UUID.test(brandParam) ? brandParam : undefined;
  const categoryParam = firstParam(params.category);
  const categoryId = categoryParam && UUID.test(categoryParam) ? categoryParam : undefined;
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const [result, brandOptions, categoryOptions] = await Promise.all([
    listVariantStockForAdmin({ q, stock, brandId, categoryId, page }),
    listBrandsForAdmin(),
    listCategoryOptions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const isFiltered = Boolean(q || brandId || categoryId);
  const anyFilter = isFiltered || Boolean(stock);

  const tabHref = (value?: StockState) => buildHref("/admin/inventory", { q, brand: brandId, category: categoryId, stock: value });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="موجودی"
        description={`${toPersianDigits(result.counts.all)} نوع کالای فعال${isFiltered ? " مطابق جستجو" : ""}${
          result.counts.out > 0 ? `، ${toPersianDigits(result.counts.out)} مورد ناموجود` : ""
        }${result.counts.low > 0 ? ` و ${toPersianDigits(result.counts.low)} مورد رو به اتمام` : ""}. موجودی را همین‌جا اصلاح کنید؛ هر تغییر در گزارش فعالیت‌ها ثبت می‌شود.`}
      />

      <FilterTabs
        items={[
          { label: "همه", href: tabHref(), active: !stock, count: result.counts.all },
          { label: "ناموجود", href: tabHref("out"), active: stock === "out", count: result.counts.out },
          { label: "رو به اتمام", href: tabHref("low"), active: stock === "low", count: result.counts.low },
          { label: "موجود", href: tabHref("in"), active: stock === "in", count: result.counts.in },
        ]}
      />

      <FilterBar resetHref="/admin/inventory" isFiltered={anyFilter} submitLabel="جستجو">
        {stock && <input type="hidden" name="stock" value={stock} />}
        <SearchField defaultValue={q} placeholder="جستجوی محصول، کد کالا، SKU، سایز یا رنگ..." />
        <SelectFilter name="brand" label="برند" defaultValue={brandId}>
          <option value="">همه برندها</option>
          {brandOptions.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
              {brand.isActive ? "" : " (غیرفعال)"}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter name="category" label="دسته‌بندی" defaultValue={categoryId}>
          <option value="">همه دسته‌ها</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectFilter>
      </FilterBar>

      {result.rows.length === 0 ? (
        anyFilter ? (
          <EmptyState title="کالایی مطابق این فیلتر پیدا نشد" description="عبارت جستجو یا فیلترها را تغییر دهید." />
        ) : (
          <EmptyState
            icon={<CheckCircleIcon width={28} height={28} />}
            title="هنوز کالایی ثبت نشده است"
            description="پس از افزودن محصول و تنوع‌های آن، موجودی هر تنوع اینجا نمایش داده می‌شود."
          />
        )
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {result.rows.map((row) => (
            <li
              key={row.variantId}
              className={`flex flex-col gap-4 rounded-[var(--radius-lg)] border bg-white p-5 lg:flex-row lg:items-start lg:justify-between ${
                row.stock === 0 ? "border-red-200" : "border-line"
              }`}
            >
              <div className="flex min-w-0 flex-col gap-2 lg:w-72 lg:shrink-0">
                <Link href={`/admin/products/${row.productId}#variants`} className="font-semibold text-ink hover:text-brand hover:underline">
                  {row.productTitle}
                </Link>
                <span className="text-[0.82rem] text-text-secondary">
                  سایز {row.size} · رنگ {row.color}
                </span>
                <span dir="ltr" className="w-fit text-[0.76rem] text-text-secondary">
                  {row.sku}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {row.stock === 0 ? (
                    <StatusBadge tone="danger">ناموجود</StatusBadge>
                  ) : row.stock <= row.lowStockThreshold ? (
                    <StatusBadge tone="warning">موجودی: {toPersianDigits(row.stock)}</StatusBadge>
                  ) : (
                    <StatusBadge tone="success">موجودی: {toPersianDigits(row.stock)}</StatusBadge>
                  )}
                  <span className="text-[0.76rem] text-text-secondary">آستانه: {toPersianDigits(row.lowStockThreshold)}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 border-t border-line pt-4 lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0">
                <StockAdjustForm variantId={row.variantId} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        pathname="/admin/inventory"
        params={{ q, stock, brand: brandId, category: categoryId }}
        page={page}
        totalPages={totalPages}
        total={result.total}
        pageSize={result.pageSize}
      />
    </div>
  );
}
