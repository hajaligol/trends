import Link from "next/link";
import { getAdminDashboardSummary } from "@/domains/admin/dashboard";
import { ORDER_STATUS_LABELS } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "داشبورد مدیریت", robots: { index: false, follow: false } };

/**
 * Landing page for `/admin` — a small set of at-a-glance numbers plus a
 * shortcut to the most recent orders, so a store operator's first click
 * every day answers "does anything need my attention right now" without
 * navigating into every sub-page.
 */
export default async function AdminDashboardPage() {
  const summary = await getAdminDashboardSummary();

  const cards = [
    { label: "سفارش‌های نیازمند پیگیری", value: toPersianDigits(summary.ordersAwaitingAction), href: "/admin/orders" },
    { label: "درآمد این ماه", value: formatToman(summary.revenueThisMonthToman), href: "/admin/orders" },
    { label: "تعداد مشتریان", value: toPersianDigits(summary.totalCustomers), href: "/admin/customers" },
    { label: "کالاهای رو به اتمام", value: toPersianDigits(summary.lowStockVariantCount), href: "/admin/inventory" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-line bg-white p-5 transition-colors hover:border-ink"
          >
            <span className="text-[0.8rem] text-text-secondary">{card.label}</span>
            <span className="text-[1.4rem] font-bold text-ink">{card.value}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[1rem] font-bold text-ink">سفارش‌های اخیر</h2>
          <Link href="/admin/orders" className="text-[0.82rem] text-text-secondary underline underline-offset-2">
            مشاهده همه
          </Link>
        </div>
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line">
          <table className="w-full min-w-[560px] text-[0.85rem]">
            <thead>
              <tr className="border-b border-line bg-header text-start text-text-secondary">
                <th className="px-4 py-2.5 text-start font-medium">شماره سفارش</th>
                <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
                <th className="px-4 py-2.5 text-start font-medium">مبلغ</th>
                <th className="px-4 py-2.5 text-start font-medium">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                    هنوز سفارشی ثبت نشده است
                  </td>
                </tr>
              ) : (
                summary.recentOrders.map((order) => (
                  <tr key={order.orderNumber} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/orders/${order.orderNumber}`} className="underline underline-offset-2">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}</td>
                    <td className="px-4 py-2.5">{formatToman(order.totalToman)}</td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {new Intl.DateTimeFormat("fa-IR").format(order.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
