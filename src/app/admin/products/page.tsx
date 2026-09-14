import Link from "next/link";
import { listProductsForAdmin } from "@/domains/catalog/admin-queries";
import { listCategoryOptions } from "@/domains/categories/queries";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "محصولات", robots: { index: false, follow: false } };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const [productPage, categoryOptions] = await Promise.all([
    listProductsForAdmin({ search: params.q, categoryId: params.category, page }),
    listCategoryOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(productPage.total / productPage.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[1.15rem] font-bold text-ink">محصولات</h1>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-ink px-5 py-2.5 text-[0.85rem] text-white hover:opacity-88"
        >
          + محصول جدید
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 text-[0.85rem]" method="get">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="جستجوی عنوان محصول..."
          className="min-w-[220px] flex-1 rounded-[var(--radius-md)] border border-line px-4 py-2.5 outline-none focus:border-ink"
        />
        <select
          name="category"
          defaultValue={params.category ?? ""}
          className="rounded-[var(--radius-md)] border border-line px-4 py-2.5 outline-none focus:border-ink"
        >
          <option value="">همه دسته‌ها</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-header px-5 py-2.5 text-ink hover:opacity-80">
          اعمال فیلتر
        </button>
      </form>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
        <table className="w-full min-w-[720px] text-[0.85rem]">
          <thead>
            <tr className="border-b border-line bg-header text-text-secondary">
              <th className="px-4 py-2.5 text-start font-medium">عنوان</th>
              <th className="px-4 py-2.5 text-start font-medium">دسته</th>
              <th className="px-4 py-2.5 text-start font-medium">تعداد نوع</th>
              <th className="px-4 py-2.5 text-start font-medium">موجودی کل</th>
              <th className="px-4 py-2.5 text-start font-medium">قیمت از</th>
              <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {productPage.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-secondary">
                  محصولی یافت نشد
                </td>
              </tr>
            ) : (
              productPage.rows.map((product) => (
                <tr key={product.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/products/${product.id}`} className="underline underline-offset-2">
                      {product.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">{product.categoryName}</td>
                  <td className="px-4 py-2.5">{toPersianDigits(product.variantCount)}</td>
                  <td className="px-4 py-2.5">{toPersianDigits(product.totalStock)}</td>
                  <td className="px-4 py-2.5">{product.minPriceToman !== null ? formatToman(product.minPriceToman) : "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-3 py-1 text-[0.75rem] ${
                        product.isActive ? "bg-sage text-ink" : "bg-header text-text-secondary"
                      }`}
                    >
                      {product.isActive ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-[0.85rem]">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={{ query: { ...params, page: String(pageNumber) } }}
              className={`rounded-full px-3.5 py-1.5 ${
                pageNumber === page ? "bg-ink text-white" : "bg-header text-ink hover:opacity-80"
              }`}
            >
              {toPersianDigits(pageNumber)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
