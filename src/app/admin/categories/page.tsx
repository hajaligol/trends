import { listCategoriesForAdmin, listCategoryOptions } from "@/domains/categories/queries";
import type { AdminCategoryRow } from "@/domains/categories/queries";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { CategoryRow } from "@/components/admin/CategoryRow";
import { filterCategoryRows, isCategoryFilterActive, parseCategoryFilter } from "@/domains/categories/admin-filter";
import type { RawParam } from "@/lib/utils/admin-filters";
import { adminButton, Card, EmptyRow, FilterBar, PageHeader, SearchField, SelectFilter, TABLE, TableCard, TH, THEAD } from "@/components/admin/ui/layout";
import { ChevronLeftIcon, PlusIcon } from "@/components/admin/ui/icons";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "دسته‌بندی‌ها", robots: { index: false, follow: false } };

/** `listCategoriesForAdmin` is tree-ordered, so each depth-1 row (مخاطب)
 * starts a new group that runs until the next depth-1 row. */
function groupByAudience(rows: AdminCategoryRow[]): AdminCategoryRow[][] {
  const groups: AdminCategoryRow[][] = [];
  for (const row of rows) {
    if (row.depth === 1 || groups.length === 0) groups.push([row]);
    else groups[groups.length - 1]!.push(row);
  }
  return groups;
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: RawParam; status?: RawParam; level?: RawParam; products?: RawParam }>;
}) {
  const filter = parseCategoryFilter(await searchParams);
  const [allRows, parentOptions] = await Promise.all([listCategoriesForAdmin(), listCategoryOptions()]);
  const isFiltered = isCategoryFilterActive(filter);
  // Matches keep their ancestors so every group still has its audience header.
  const { rows: categoryRows, matchCount } = filterCategoryRows(allRows, filter);
  const groups = groupByAudience(categoryRows);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="دسته‌بندی‌ها"
        description="ساختار سه‌سطحی: مخاطب (مردانه/زنانه/بچگانه) › گروه (لباس، کفش، کیف، اکسسوری) › نوع (مثلاً پیراهن). محصولات فقط در دسته‌های نوع (سطح سوم) ثبت می‌شوند و صفحه دسته‌های بالاتر، محصولات زیرمجموعه‌اش را نشان می‌دهد."
        actions={
          <a href="#new-category" className={adminButton("primary", "md")}>
            <PlusIcon width={18} height={18} />
            دسته جدید
          </a>
        }
      />

      {allRows.length > 0 && (
        <>
          <FilterBar resetHref="/admin/categories" isFiltered={isFiltered} submitLabel="جستجو">
            <SearchField defaultValue={filter.q} placeholder="جستجوی نام یا نامک دسته..." />
            <SelectFilter name="level" label="سطح" defaultValue={filter.level ? String(filter.level) : ""}>
              <option value="">همه سطح‌ها</option>
              <option value="1">مخاطب</option>
              <option value="2">گروه</option>
              <option value="3">نوع</option>
            </SelectFilter>
            <SelectFilter name="status" label="وضعیت" defaultValue={filter.status}>
              <option value="">همه</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </SelectFilter>
            <SelectFilter name="products" label="محصولات" defaultValue={filter.products}>
              <option value="">همه</option>
              <option value="with">دارای محصول</option>
              <option value="without">بدون محصول</option>
            </SelectFilter>
          </FilterBar>
          {isFiltered && (
            <p className="m-0 text-[0.82rem] text-text-secondary">
              {toPersianDigits(matchCount)} دسته مطابق فیلتر
              {categoryRows.length > matchCount ? " (دسته‌های والد برای حفظ ساختار درخت هم نمایش داده می‌شوند)" : ""}
            </p>
          )}
        </>
      )}

      {categoryRows.length === 0 ? (
        <TableCard>
          <table className={TABLE}>
            <tbody>
              <EmptyRow colSpan={5}>{isFiltered ? "دسته‌ای مطابق این فیلتر پیدا نشد." : "هنوز دسته‌ای ثبت نشده است."}</EmptyRow>
            </tbody>
          </table>
        </TableCard>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group, index) => {
            const [root] = group;
            return (
              // Native <details>: keyboard/screen-reader accessible with no
              // client JS. The first audience starts open; the rest collapse
              // so the page isn't thousands of pixels tall.
              <details key={root?.id} open={isFiltered || index === 0} className="group rounded-[var(--radius-lg)] border border-line bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-lg)] px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[1rem] font-bold text-ink">{root?.name}</span>
                    <span className="text-[0.78rem] text-text-secondary">
                      {toPersianDigits(group.length - 1)} زیردسته · {toPersianDigits(root?.subtreeProductCount ?? 0)} محصول
                    </span>
                  </span>
                  <ChevronLeftIcon width={20} height={20} className="shrink-0 text-text-secondary transition-transform group-open:-rotate-90" />
                </summary>
                <div className="border-t border-line">
                  <div className="overflow-x-auto">
                    <table className={`${TABLE} min-w-[720px]`}>
                      <thead className={THEAD}>
                        <tr>
                          <th className={TH}>دسته</th>
                          <th className={TH}>نامک</th>
                          <th className={TH}>محصولات (با زیردسته‌ها)</th>
                          <th className={TH}>وضعیت</th>
                          <th className={TH}>
                            <span className="sr-only">عملیات</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.map((category) => (
                          <CategoryRow key={category.id} category={category} parentOptions={parentOptions} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      <Card id="new-category" title="افزودن دسته جدید" description="برای ساخت یک «نوع» جدید، گروه مناسب را به‌عنوان والد انتخاب کنید.">
        <CategoryForm parentOptions={parentOptions} />
      </Card>
    </div>
  );
}
