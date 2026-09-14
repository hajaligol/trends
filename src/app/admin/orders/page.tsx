import type { Metadata } from "next";
import Link from "next/link";
import { listOrdersForAdmin } from "@/domains/orders/queries";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "سفارش‌ها — مدیریت",
  robots: { index: false, follow: false },
};

/**
 * Phase 11 update: `listOrdersForAdmin` is now paginated/filterable/
 * searchable (see that function's header comment) — this page was
 * previously an unpaginated-but-capped `limit(200)` list, per the
 * explicit hand-off note left in Phase 10.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const status = params.status ? (params.status as OrderStatus) : undefined;

  const orderPage = await listOrdersForAdmin({ status, search: params.q, page });
  const totalPages = Math.max(1, Math.ceil(orderPage.total / orderPage.pageSize));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-[1.3rem] font-bold">سفارش‌ها ({toPersianDigits(orderPage.total)})</h1>

      <form className="flex flex-wrap gap-3 text-[0.85rem]" method="get">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="جستجوی شماره سفارش یا موبایل گیرنده..."
          className="min-w-[240px] flex-1 rounded-[var(--radius-md)] border border-line px-4 py-2.5 outline-none focus:border-ink"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-[var(--radius-md)] border border-line px-4 py-2.5 outline-none focus:border-ink"
        >
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-header px-5 py-2.5 text-ink hover:opacity-80">
          اعمال فیلتر
        </button>
      </form>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-white">
        <table className="w-full text-right text-[0.85rem]">
          <thead className="border-b border-line text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">شماره سفارش</th>
              <th className="px-4 py-3 font-medium">تاریخ</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
              <th className="px-4 py-3 font-medium">مبلغ</th>
            </tr>
          </thead>
          <tbody>
            {orderPage.rows.map((order) => (
              <tr key={order.id} className="border-b border-line last:border-0 hover:bg-ink/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.orderNumber}`} dir="ltr" className="text-right font-semibold text-ink underline underline-offset-2">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {toPersianDigits(
                    new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "short", day: "numeric" }).format(
                      order.createdAt,
                    ),
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-[0.78rem] text-ink">
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-ink">{formatToman(order.totalToman)}</td>
              </tr>
            ))}
            {orderPage.rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  هیچ سفارشی یافت نشد.
                </td>
              </tr>
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
