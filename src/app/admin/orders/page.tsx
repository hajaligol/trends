import type { Metadata } from "next";
import Link from "next/link";
import { listOrdersForAdmin } from "@/domains/orders/queries";
import { ORDER_STATUS_LABELS } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "سفارش‌ها — مدیریت",
  robots: { index: false, follow: false },
};

/**
 * Unpaginated-but-capped list (`listOrdersForAdmin`'s own `limit(200)`)
 * — a real filterable/paginated admin order list is Phase 11's scope,
 * see `src/domains/orders/admin-actions.ts`'s header comment. Every row
 * here is a real, live database read, never demo data.
 */
export default async function AdminOrdersPage() {
  const orders = await listOrdersForAdmin();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-[1.3rem] font-bold">سفارش‌ها ({toPersianDigits(orders.length)})</h1>
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
            {orders.map((order) => (
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
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  هیچ سفارشی ثبت نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
