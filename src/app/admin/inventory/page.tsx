import Link from "next/link";
import { listLowStockVariants } from "@/domains/catalog/admin-queries";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin/ui/layout";
import { CheckCircleIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "موجودی", robots: { index: false, follow: false } };

/**
 * Shows every active variant at or below its own low-stock threshold
 * (TRENDS_PROJECT_CONTEXT.md §6 "low-stock threshold", "out-of-stock
 * handling") with an inline adjustment form — see
 * `src/domains/inventory/actions.ts`'s header comment for why this is a
 * single audited delta-adjustment rather than a full movement ledger
 * table. Out-of-stock rows come first (the query orders by stock asc).
 */
export default async function AdminInventoryPage() {
  const rows = await listLowStockVariants();
  const outOfStock = rows.filter((row) => row.stock === 0).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="موجودی"
        description={
          rows.length === 0
            ? "کالاهایی که موجودی‌شان به آستانه کمبود برسد، اینجا نمایش داده می‌شوند."
            : `${toPersianDigits(rows.length)} نوع کالا رو به اتمام است${outOfStock > 0 ? ` که ${toPersianDigits(outOfStock)} مورد کاملاً ناموجود است` : ""}. موجودی را همین‌جا اصلاح کنید؛ هر تغییر در گزارش فعالیت‌ها ثبت می‌شود.`
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<CheckCircleIcon width={28} height={28} />}
          title="موجودی همه کالاها کافی است"
          description="در حال حاضر هیچ کالای فعالی به آستانه کمبود موجودی نرسیده است."
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {rows.map((row) => (
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
                  ) : (
                    <StatusBadge tone="warning">موجودی: {toPersianDigits(row.stock)}</StatusBadge>
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
    </div>
  );
}
