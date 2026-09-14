import Link from "next/link";
import { listAuditLogEntityTypes, listAuditLogs } from "@/domains/analytics/audit";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "گزارش فعالیت‌ها", robots: { index: false, follow: false } };

const ACTION_LABELS: Record<string, string> = {
  "order.status_transition": "تغییر وضعیت سفارش",
  "category.create": "ایجاد دسته",
  "category.update": "ویرایش دسته",
  "category.delete": "حذف دسته",
  "product.create": "ایجاد محصول",
  "product.update": "ویرایش محصول",
  "product.delete": "حذف محصول",
  "product_variant.create": "ایجاد نوع محصول",
  "product_variant.update": "ویرایش نوع محصول",
  "product_variant.delete": "حذف نوع محصول",
  "product_image.create": "افزودن تصویر",
  "product_image.delete": "حذف تصویر",
  "inventory.adjust": "تغییر موجودی",
  "coupon.create": "ایجاد کد تخفیف",
  "coupon.update": "ویرایش کد تخفیف",
  "coupon.toggle_active": "تغییر وضعیت کد تخفیف",
  "hero_slide.create": "ایجاد اسلاید",
  "hero_slide.update": "ویرایش اسلاید",
  "hero_slide.delete": "حذف اسلاید",
  "promo_banner.create": "ایجاد بنر",
  "promo_banner.update": "ویرایش بنر",
  "promo_banner.delete": "حذف بنر",
  "settings.update": "ویرایش تنظیمات",
  "customer.role_change": "تغییر نقش کاربر",
};

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const [logPage, entityTypes] = await Promise.all([
    listAuditLogs({ entityType: params.entityType, page }),
    listAuditLogEntityTypes(),
  ]);
  const totalPages = Math.max(1, Math.ceil(logPage.total / logPage.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[1.15rem] font-bold text-ink">گزارش فعالیت‌ها</h1>

      <form className="flex gap-3 text-[0.85rem]" method="get">
        <select
          name="entityType"
          defaultValue={params.entityType ?? ""}
          className="rounded-[var(--radius-md)] border border-line px-4 py-2.5 outline-none focus:border-ink"
        >
          <option value="">همه موضوعات</option>
          {entityTypes.map((entityType) => (
            <option key={entityType} value={entityType}>
              {entityType}
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
              <th className="px-4 py-2.5 text-start font-medium">تاریخ</th>
              <th className="px-4 py-2.5 text-start font-medium">انجام‌دهنده</th>
              <th className="px-4 py-2.5 text-start font-medium">عملیات</th>
              <th className="px-4 py-2.5 text-start font-medium">موضوع</th>
              <th className="px-4 py-2.5 text-start font-medium">جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {logPage.rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                  فعالیتی ثبت نشده است
                </td>
              </tr>
            ) : (
              logPage.rows.map((log) => (
                <tr key={log.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-2.5 whitespace-nowrap text-text-secondary">
                    {new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(log.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary" dir="ltr">
                    {log.actorMobile ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">{ACTION_LABELS[log.action] ?? log.action}</td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-2.5 text-[0.78rem] text-text-secondary" dir="ltr">
                    {log.payload ?? "—"}
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
