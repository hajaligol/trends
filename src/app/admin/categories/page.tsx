import { listCategoriesForAdmin, listCategoryOptions } from "@/domains/categories/queries";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { CategoryRow } from "@/components/admin/CategoryRow";

export const metadata = { title: "دسته‌بندی‌ها", robots: { index: false, follow: false } };

export default async function AdminCategoriesPage() {
  const [categoryRows, parentOptions] = await Promise.all([listCategoriesForAdmin(), listCategoryOptions()]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-[1.15rem] font-bold text-ink">دسته‌بندی‌ها</h1>
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
          <table className="w-full min-w-[720px] text-[0.85rem]">
            <thead>
              <tr className="border-b border-line bg-header text-text-secondary">
                <th className="px-4 py-2.5 text-start font-medium">نام</th>
                <th className="px-4 py-2.5 text-start font-medium">نامک</th>
                <th className="px-4 py-2.5 text-start font-medium">والد</th>
                <th className="px-4 py-2.5 text-start font-medium">تعداد محصول</th>
                <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
                <th className="px-4 py-2.5 text-start font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-text-secondary">
                    هنوز دسته‌ای ثبت نشده است
                  </td>
                </tr>
              ) : (
                categoryRows.map((category) => (
                  <CategoryRow key={category.id} category={category} parentOptions={parentOptions} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <h2 className="text-[1rem] font-bold text-ink">افزودن دسته جدید</h2>
        <CategoryForm parentOptions={parentOptions} />
      </section>
    </div>
  );
}
