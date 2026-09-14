import Link from "next/link";
import { listLowStockVariants } from "@/domains/catalog/admin-queries";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "موجودی", robots: { index: false, follow: false } };

/**
 * Shows every active variant at or below its own low-stock threshold
 * (TRENDS_PROJECT_CONTEXT.md §6 "low-stock threshold", "out-of-stock
 * handling") with an inline adjustment form — see
 * `src/domains/inventory/actions.ts`'s header comment for why this is a
 * single audited delta-adjustment rather than a full movement ledger
 * table.
 */
export default async function AdminInventoryPage() {
  const rows = await listLowStockVariants();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[1.15rem] font-bold text-ink">موجودی — کالاهای رو به اتمام</h1>
        <p className="mt-1 text-[0.85rem] text-text-secondary">
          فقط انواع محصول فعالی که موجودی آن‌ها به آستانه کمبود موجودی رسیده یا کمتر است نمایش داده می‌شود.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-line bg-white p-6 text-center text-[0.85rem] text-text-secondary">
          در حال حاضر هیچ کالایی رو به اتمام نیست.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={row.variantId}
              className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-0.5">
                <Link href={`/admin/products/${row.productId}`} className="font-medium text-ink underline underline-offset-2">
                  {row.productTitle}
                </Link>
                <span className="text-[0.8rem] text-text-secondary" dir="ltr">
                  {row.sku} · {row.size}/{row.color}
                </span>
                <span
                  className={`w-fit rounded-full px-3 py-0.5 text-[0.75rem] ${
                    row.stock === 0 ? "bg-blush text-ink" : "bg-yellow text-ink"
                  }`}
                >
                  موجودی: {toPersianDigits(row.stock)} (آستانه: {toPersianDigits(row.lowStockThreshold)})
                </span>
              </div>
              <StockAdjustForm variantId={row.variantId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
