import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/domains/auth/actions";
import { listOrdersForUser } from "@/domains/orders/queries";
import { ORDER_STATUS_LABELS } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "سفارش‌های من",
  robots: { index: false, follow: false },
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending_payment: "bg-[#FBE1B4]/60 text-ink",
  paid: "bg-[#D2D9BF]/60 text-ink",
  processing: "bg-[#AAD0E2]/50 text-ink",
  shipped: "bg-[#B5D6CF]/60 text-ink",
  delivered: "bg-[#D2D9BF] text-ink",
  cancelled: "bg-ink/[0.08] text-text-secondary",
  refunded: "bg-ink/[0.08] text-text-secondary",
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 text-[1.4rem] font-bold">سفارش‌های من</h1>

      {orders.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-line bg-white p-6 text-[0.92rem] text-text-secondary">
          هنوز سفارشی ثبت نکرده‌اید.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/order/${order.orderNumber}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-4 text-[0.88rem] transition-colors hover:border-ink/30"
            >
              <div className="flex flex-col gap-1">
                <span dir="ltr" className="text-right font-semibold text-ink">
                  {order.orderNumber}
                </span>
                <span className="text-text-secondary">
                  {toPersianDigits(
                    new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(
                      order.createdAt,
                    ),
                  )}
                </span>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[0.8rem] ${STATUS_BADGE_CLASSES[order.status] ?? "bg-ink/[0.06] text-ink"}`}
              >
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </span>
              <span className="font-semibold text-ink">{formatToman(order.totalToman)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
