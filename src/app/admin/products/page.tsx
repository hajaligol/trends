import Image from "next/image";
import Link from "next/link";
import { listProductsForAdmin } from "@/domains/catalog/admin-queries";
import { listCategoryOptions } from "@/domains/categories/queries";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import {
  adminButton,
  buildHref,
  EmptyState,
  FilterBar,
  FilterTabs,
  PageHeader,
  Pagination,
  SearchField,
  SelectInput,
  StatusBadge,
  TABLE,
  TD,
  TD_MUTED,
  TableCard,
  TH,
  THEAD,
  TR,
} from "@/components/admin/ui/layout";
import { PlusIcon, ShirtIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "محصولات", robots: { index: false, follow: false } };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const status = params.status === "active" || params.status === "inactive" ? params.status : undefined;

  const [productPage, categoryOptions] = await Promise.all([
    listProductsForAdmin({
      search: params.q,
      categoryId: params.category,
      isActive: status === undefined ? undefined : status === "active",
      page,
    }),
    listCategoryOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(productPage.total / productPage.pageSize));
  const isFiltered = Boolean(params.q || params.category || status);
  const tab = (value?: string) => buildHref("/admin/products", { status: value, q: params.q, category: params.category });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="محصولات"
        description={`${toPersianDigits(productPage.total)} محصول${isFiltered ? " مطابق فیلتر" : ""}. برای ویرایش قیمت، موجودی و تصاویر، روی محصول بزنید.`}
        actions={
          <Link href="/admin/products/new" className={adminButton("primary", "md")}>
            <PlusIcon width={18} height={18} />
            محصول جدید
          </Link>
        }
      />

      <FilterTabs
        items={[
          { label: "همه", href: tab(), active: !status },
          { label: "فعال", href: tab("active"), active: status === "active" },
          { label: "غیرفعال", href: tab("inactive"), active: status === "inactive" },
        ]}
      />

      <FilterBar resetHref="/admin/products" isFiltered={isFiltered}>
        {status && <input type="hidden" name="status" value={status} />}
        <SearchField defaultValue={params.q} placeholder="جستجوی عنوان، کد کالا یا SKU..." />
        <SelectInput name="category" defaultValue={params.category ?? ""} label="دسته‌بندی">
          <option value="">همه دسته‌ها</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </SelectInput>
      </FilterBar>

      {productPage.rows.length === 0 ? (
        <EmptyState
          icon={<ShirtIcon width={26} height={26} />}
          title={isFiltered ? "محصولی مطابق این فیلتر پیدا نشد" : "هنوز محصولی ثبت نشده است"}
          description={isFiltered ? "عبارت جستجو یا فیلترها را تغییر دهید." : "اولین محصول فروشگاه را بسازید؛ بعد از آن می‌توانید سایز، رنگ و تصاویرش را اضافه کنید."}
          action={
            !isFiltered && (
              <Link href="/admin/products/new" className={adminButton("primary", "md")}>
                <PlusIcon width={18} height={18} />
                ساخت اولین محصول
              </Link>
            )
          }
        />
      ) : (
        <TableCard>
          <table className={`${TABLE} min-w-[820px]`}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>محصول</th>
                <th className={TH}>کد کالا</th>
                <th className={TH}>دسته</th>
                <th className={TH}>انواع</th>
                <th className={TH}>موجودی کل</th>
                <th className={TH}>قیمت از</th>
                <th className={TH}>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {productPage.rows.map((product) => (
                <tr key={product.id} className={TR}>
                  <td className={TD}>
                    <Link href={`/admin/products/${product.id}`} className="group flex items-center gap-3">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-card-image">
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                        ) : (
                          <ShirtIcon width={20} height={20} className="absolute inset-0 m-auto text-text-secondary/60" />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-semibold text-ink group-hover:text-brand group-hover:underline">{product.title}</span>
                        {(product.isFeatured || product.isNewArrival) && (
                          <span className="flex gap-1.5 text-[0.7rem] text-text-secondary">
                            {product.isFeatured && <span className="rounded-full bg-yellow/70 px-2 py-0.5 text-ink">ویژه</span>}
                            {product.isNewArrival && <span className="rounded-full bg-aqua/70 px-2 py-0.5 text-ink">جدید</span>}
                          </span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className={`${TD} text-[0.82rem] font-medium`}>{toPersianDigits(product.productCode)}</td>
                  <td className={TD_MUTED}>{product.categoryName.split(" › ").pop()}</td>
                  <td className={TD}>
                    {product.variantCount === 0 ? (
                      <StatusBadge tone="warning">بدون نوع</StatusBadge>
                    ) : (
                      toPersianDigits(product.variantCount)
                    )}
                  </td>
                  <td className={TD}>
                    {product.variantCount > 0 && product.totalStock === 0 ? (
                      <StatusBadge tone="danger">ناموجود</StatusBadge>
                    ) : (
                      toPersianDigits(product.totalStock)
                    )}
                  </td>
                  <td className={`${TD} font-medium`}>{product.minPriceToman !== null ? formatToman(product.minPriceToman) : "—"}</td>
                  <td className={TD}>
                    <StatusBadge tone={product.isActive ? "success" : "neutral"}>{product.isActive ? "فعال" : "غیرفعال"}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      <Pagination
        pathname="/admin/products"
        params={{ q: params.q, category: params.category, status }}
        page={page}
        totalPages={totalPages}
        total={productPage.total}
        pageSize={productPage.pageSize}
      />
    </div>
  );
}
