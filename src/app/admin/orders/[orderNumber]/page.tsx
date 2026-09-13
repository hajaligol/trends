import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderByOrderNumberForAdmin, getOrderStatusHistoryForOrder } from "@/domains/orders/queries";
import { getAdminAllowedNextStatuses, ORDER_STATUS_LABELS } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { AdminOrderStatusForm } from "@/components/admin/AdminOrderStatusForm";

export const metadata: Metadata = {
  title: "جزئیات سفارش — مدیریت",
  robots: { index: false, follow: false },
};

/**
 * Not ownership-scoped by a customer id (there is no "owning customer"
 * concept for an admin view) — authorization is the parent
 * `/admin` layout's `role` check, per
 * `src/domains/orders/queries.ts`'s `getOrderByOrderNumberForAdmin`
 * header comment ("callers are responsible for checking role
 * themselves").
 */
export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrderByOrderNumberForAdmin(orderNumber);
  if (!order) notFound();

  const history = await getOrderStatusHistoryForOrder(order.id);
  const allowedNextStatuses = getAdminAllowedNextStatuses(order.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 dir="ltr" className="m-0 text-right text-[1.3rem] font-bold">
          {order.orderNumber}
        </h1>
        <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-[0.8rem] text-ink">
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-white p-5 lg:col-span-2">
          <h2 className="m-0 text-[1rem] font-bold">اقلام سفارش</h2>
          <div className="flex flex-col gap-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-[0.85rem]">
                <div>
                  <p className="font-semibold text-ink">{item.productTitle}</p>
                  <p className="text-text-secondary">
                    {item.size} / {item.color} × {toPersianDigits(item.quantity)}
                  </p>
                </div>
                <span className="font-semibold text-ink">{formatToman(item.lineTotalToman)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-line pt-3 text-[0.85rem]">
            <h3 className="mb-2 font-bold text-ink">آدرس ارسال</h3>
            <p className="font-semibold text-ink">{order.recipientName}</p>
            <p dir="ltr" className="text-right text-text-secondary">
              {toPersianDigits(order.recipientMobile.replace("+98", "0"))}
            </p>
            <p className="text-text-secondary">
              {order.province}، {order.city}، {order.addressLine}
              {order.plaqueUnitDetails ? `، ${order.plaqueUnitDetails}` : ""}
            </p>
            {order.trackingNumber && (
              <p className="mt-2 text-text-secondary">
                کد رهگیری: <span dir="ltr">{toPersianDigits(order.trackingNumber)}</span>
              </p>
            )}
            {order.cancelReason && <p className="mt-2 text-text-secondary">دلیل لغو: {order.cancelReason}</p>}
          </div>

          {history.length > 0 && (
            <div className="border-t border-line pt-3">
              <h3 className="mb-2 text-[0.9rem] font-bold text-ink">تاریخچه وضعیت</h3>
              <ol className="flex flex-col gap-2 text-[0.82rem]">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3">
                    <span className="text-ink">
                      {entry.fromStatus ? `${ORDER_STATUS_LABELS[entry.fromStatus]} ← ` : ""}
                      {ORDER_STATUS_LABELS[entry.toStatus]}
                      <span className="text-text-secondary">
                        {" "}
                        ({entry.actorRole === "admin" ? "مدیر" : entry.actorRole === "customer" ? "مشتری" : "سیستم"})
                      </span>
                    </span>
                    <span className="text-text-secondary">
                      {toPersianDigits(
                        new Intl.DateTimeFormat("fa-IR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(entry.createdAt),
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-white p-5">
          <h2 className="m-0 text-[1rem] font-bold">تغییر وضعیت سفارش</h2>
          <AdminOrderStatusForm orderNumber={order.orderNumber} allowedNextStatuses={allowedNextStatuses} />
        </section>
      </div>
    </div>
  );
}
