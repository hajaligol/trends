import { listBrandsForAdmin } from "@/domains/brands/queries";
import { BrandForm } from "@/components/admin/BrandForm";
import { BrandRow } from "@/components/admin/BrandRow";
import { brandCountries, filterBrands, filterBrandsIgnoringStatus, isBrandFilterActive, parseBrandFilter } from "@/domains/brands/admin-filter";
import type { RawParam } from "@/lib/utils/admin-filters";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { adminButton, buildHref, Card, EmptyRow, FilterBar, FilterTabs, PageHeader, SearchField, SelectFilter, TABLE, TableCard, TH, THEAD } from "@/components/admin/ui/layout";
import { PlusIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "برندها", robots: { index: false, follow: false } };

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: RawParam; status?: RawParam; products?: RawParam; country?: RawParam }>;
}) {
  const filter = parseBrandFilter(await searchParams);
  const allBrands = await listBrandsForAdmin();
  const brands = filterBrands(allBrands, filter);
  const isFiltered = isBrandFilterActive(filter);
  const countries = brandCountries(allBrands);
  const withoutStatus = filterBrandsIgnoringStatus(allBrands, filter);
  const activeCount = withoutStatus.filter((brand) => brand.isActive).length;
  const tabHref = (status?: "active" | "inactive") => buildHref("/admin/brands", { q: filter.q, products: filter.products, country: filter.country, status });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="برندها"
        description="برند هر محصول از میان همین فهرست انتخاب می‌شود. برند غیرفعال در فرم محصول پیشنهاد نمی‌شود و در فروشگاه نمایش داده نمی‌شود، ولی محصولاتش فعال می‌مانند. برندی که محصول دارد قابل حذف نیست؛ غیرفعالش کنید."
        actions={
          <a href="#new-brand" className={adminButton("primary", "md")}>
            <PlusIcon width={18} height={18} />
            برند جدید
          </a>
        }
      />

      <FilterTabs
        items={[
          { label: "همه", href: tabHref(), active: !filter.status, count: withoutStatus.length },
          { label: "فعال", href: tabHref("active"), active: filter.status === "active", count: activeCount },
          { label: "غیرفعال", href: tabHref("inactive"), active: filter.status === "inactive", count: withoutStatus.length - activeCount },
        ]}
      />
      <FilterBar resetHref="/admin/brands" isFiltered={isFiltered} submitLabel="جستجو">
        {filter.status && <input type="hidden" name="status" value={filter.status} />}
        <SearchField defaultValue={filter.q} placeholder="جستجوی نام فارسی، نام انگلیسی یا نامک برند..." />
        {countries.length > 0 && (
          <SelectFilter name="country" label="کشور سازنده" defaultValue={filter.country}>
            <option value="">همه کشورها</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </SelectFilter>
        )}
        <SelectFilter name="products" label="محصولات" defaultValue={filter.products}>
          <option value="">همه</option>
          <option value="with">دارای محصول</option>
          <option value="without">بدون محصول</option>
        </SelectFilter>
      </FilterBar>
      {isFiltered && <p className="m-0 text-[0.82rem] text-text-secondary">{toPersianDigits(brands.length)} برند مطابق فیلتر</p>}

      <TableCard>
        <table className={`${TABLE} min-w-[720px]`}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>برند</th>
              <th className={TH}>نامک</th>
              <th className={TH}>محصولات</th>
              <th className={TH}>وضعیت</th>
              <th className={TH}>
                <span className="sr-only">عملیات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {brands.length === 0 ? (
              <EmptyRow colSpan={5}>{isFiltered ? "برندی مطابق این فیلتر پیدا نشد." : "هنوز برندی ثبت نشده است."}</EmptyRow>
            ) : (
              brands.map((brand) => <BrandRow key={brand.id} brand={brand} />)
            )}
          </tbody>
        </table>
      </TableCard>

      <Card id="new-brand" title="افزودن برند جدید" description="نام برند یکتاست (بدون توجه به حروف بزرگ و کوچک لاتین).">
        <BrandForm />
      </Card>
    </div>
  );
}
