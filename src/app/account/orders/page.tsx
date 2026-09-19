import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/domains/auth/actions";
import { getOrderItemPreviews, listOrdersForUser } from "@/domains/orders/queries";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { EmptyState } from "@/components/account/EmptyState";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { OrderThumbnails } from "@/components/account/OrderThumbnails";
import { formatPersianDate } from "@/components/account/format";
import { DashboardOrdersIcon } from "@/components/ui/dashboard-icons";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "سفارش‌های من",
  robots: { index: false, follow: false },
};

/**
 * `/account/orders` — Phase 10's "order history" task. Ownership-scoped
 * via `listOrdersForUser(userId)` (`src/domains/orders/queries.ts`), the
 * same shape as every other query in this codebase; a signed-in customer
 * only ever sees rows where `orders.userId` is their own. This page
 * lists every order the customer has ever placed, however old, and
 * links each to its existing `/order/[orderNumber]` detail page — Phase
 * 8/9 built that page as the checkout-confirmation view; this is the
 * first in-app place a customer can *revisit* it later without knowing
 * the order number by heart (documented as a known gap in Phase 8's
 * PROGRESS.md entry).
 */
export default async function OrderHistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null; // Parent layout already redirects; defensive only.

  const orders = await listOrdersForUser(user.id);
  // Ids come from the user-scoped read above, so previews are ownership-safe.
  const itemsByOrder = await getOrderItemPreviews(orders.map((order) => order.id));

  return (
    <div className="flex flex-col gap-6">
      <AccountPageHeader
        icon={<DashboardOrdersIcon className="h-6 w-6" />}
        title="سفارش‌های من"
        description={
          orders.length > 0
            ? `${toPersianDigits(orders.length)} سفارش ثبت‌شده`
            : "تاریخچه سفارش‌های شما اینجا نمایش داده می‌شود"
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={<DashboardOrdersIcon className="h-7 w-7" />}
          title="هنوز سفارشی ثبت نکرده‌اید"
          description="بعد از اولین خرید، سفارش‌های شما اینجا نمایش داده می‌شوند."
          action={
            <Link
              href="/"
              className="mt-1 rounded-full bg-brand px-5 py-2 text-[0.88rem] font-semibold text-white transition-colors duration-200 hover:bg-brand-dark"
            >
              شروع خرید
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/order/${order.orderNumber}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--radius-lg)] border border-line bg-white p-4 shadow-[0_10px_26px_-22px_rgba(24,38,48,0.35)] transition duration-300 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_18px_36px_-22px_rgba(91,15,165,0.4)] motion-reduce:hover:translate-y-0"
            >
              {(itemsByOrder.get(order.id) ?? []).length > 0 ? (
                <OrderThumbnails items={itemsByOrder.get(order.id) ?? []} />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f6f3ee] text-ink"
                >
                  <DashboardOrdersIcon className="h-6 w-6" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span dir="ltr" className="text-right text-[0.92rem] font-semibold">
                  {order.orderNumber}
                </span>
                <span className="text-[0.82rem] text-text-secondary">{formatPersianDate(order.createdAt)}</span>
              </div>
              <OrderStatusBadge status={order.status} />
              <span className="min-w-[110px] text-end text-[0.95rem] font-semibold">{formatToman(order.totalToman)}</span>
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 shrink-0 text-text-secondary"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
