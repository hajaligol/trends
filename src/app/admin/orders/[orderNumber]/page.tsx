import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByOrderNumberForAdmin, getOrderStatusHistoryForOrder } from "@/domains/orders/queries";
import { getAdminAllowedNextStatuses, ORDER_STATUS_LABELS } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { AdminOrderStatusForm } from "@/components/admin/AdminOrderStatusForm";
import { ORDER_STATUS_TONES } from "@/components/admin/status";
import { Card, DetailRow, formatDateTime, PageHeader, StatusBadge } from "@/components/admin/ui/layout";

export const metadata: Metadata = {
  title: "جزئیات سفارش — مدیریت",
  robots: { index: false, follow: false },
};

const ACTOR_LABELS = { admin: "مدیر", customer: "مشتری", system: "سیستم" } as const;

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
  // Newest first: the operator cares about "what happened last".
  const timeline = [...history].reverse();
  const mobile = toPersianDigits(order.recipientMobile.replace("+98", "0"));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={order.orderNumber}
        ltrTitle
        backHref="/admin/orders"
        backLabel="بازگشت به سفارش‌ها"
        description={`ثبت‌شده در ${formatDateTime(order.createdAt)}`}
        badge={<StatusBadge tone={ORDER_STATUS_TONES[order.status] ?? "neutral"}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</StatusBadge>}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title={`اقلام سفارش (${toPersianDigits(order.items.length)})`}>
            <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-card-image">
                    {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link href={`/product/${item.productSlug}`} target="_blank" className="truncate text-[0.92rem] font-semibold text-ink hover:text-brand hover:underline">
                      {item.productTitle}
                    </Link>
                    <span className="text-[0.8rem] text-text-secondary">
                      سایز {item.size} · رنگ {item.color} · <span dir="ltr">{item.sku}</span>
                    </span>
                    <span className="text-[0.8rem] text-text-secondary">
                      {toPersianDigits(item.quantity)} × {formatToman(item.unitPriceToman)}
                    </span>
                  </div>
                  <span className="shrink-0 text-[0.92rem] font-bold text-ink">{formatToman(item.lineTotalToman)}</span>
                </li>
              ))}
            </ul>

            <dl className="m-0 mt-5 flex flex-col gap-2.5 border-t border-line pt-4">
              <DetailRow label="جمع اقلام">{formatToman(order.subtotalToman)}</DetailRow>
              <DetailRow label={`هزینه ارسال (${order.shippingMethodLabel})`}>
                {order.shippingFeeToman === 0 ? "رایگان" : formatToman(order.shippingFeeToman)}
              </DetailRow>
              {order.discountToman > 0 && (
                <DetailRow label={order.couponCode ? `تخفیف (کد ${order.couponCode})` : "تخفیف"}>
                  <span className="text-[#4f5f2a]">− {formatToman(order.discountToman)}</span>
                </DetailRow>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                <dt className="text-[0.95rem] font-bold text-ink">مبلغ کل</dt>
                <dd className="m-0 text-[1.15rem] font-bold text-ink">{formatToman(order.totalToman)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="وضعیت و تاریخچه" description="هر تغییر وضعیت همراه با انجام‌دهنده و زمان ثبت می‌شود.">
            {timeline.length === 0 ? (
              <p className="m-0 text-[0.86rem] text-text-secondary">هنوز تغییر وضعیتی ثبت نشده است.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col p-0">
                {timeline.map((entry, index) => (
                  <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < timeline.length - 1 && (
                      <span aria-hidden="true" className="absolute start-[7px] top-4 bottom-0 w-px bg-ink/15" />
                    )}
                    <span
                      aria-hidden="true"
                      className={`relative z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-[3px] border-white ring-1 ${
                        index === 0 ? "bg-brand ring-brand" : "bg-ink/25 ring-ink/15"
                      }`}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={ORDER_STATUS_TONES[entry.toStatus] ?? "neutral"}>{ORDER_STATUS_LABELS[entry.toStatus]}</StatusBadge>
                        {entry.fromStatus && (
                          <span className="text-[0.78rem] text-text-secondary">از «{ORDER_STATUS_LABELS[entry.fromStatus]}»</span>
                        )}
                      </div>
                      <p className="m-0 text-[0.78rem] text-text-secondary">
                        {ACTOR_LABELS[entry.actorRole] ?? "سیستم"} · {formatDateTime(entry.createdAt)}
                      </p>
                      {entry.note && (
                        <p className="m-0 rounded-[var(--radius-sm)] bg-bg px-3 py-2 text-[0.84rem] leading-6 text-ink/85">{entry.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6">
          <Card title="تغییر وضعیت سفارش">
            <AdminOrderStatusForm key={order.status} orderNumber={order.orderNumber} allowedNextStatuses={allowedNextStatuses} currentStatus={order.status} />
          </Card>

          <Card title="اطلاعات گیرنده">
            <dl className="m-0 flex flex-col gap-3">
              <DetailRow label="نام">{order.recipientName}</DetailRow>
              <DetailRow label="موبایل">
                <span dir="ltr">{mobile}</span>
              </DetailRow>
              <DetailRow label="کد پستی">
                <span dir="ltr">{toPersianDigits(order.postalCode)}</span>
              </DetailRow>
            </dl>
            <p className="m-0 mt-3 border-t border-line pt-3 text-[0.86rem] leading-7 text-ink/85">
              {order.province}، {order.city}، {order.addressLine}
              {order.plaqueUnitDetails ? `، ${order.plaqueUnitDetails}` : ""}
            </p>
            <Link href={`/admin/customers/${order.userId}`} className="mt-3 inline-block text-[0.82rem] font-medium text-brand hover:underline">
              مشاهده پروفایل مشتری
            </Link>
          </Card>

          <Card title="ارسال و یادداشت‌ها">
            <dl className="m-0 flex flex-col gap-3">
              <DetailRow label="روش ارسال">{order.shippingMethodLabel}</DetailRow>
              <DetailRow label="زمان تحویل">{order.shippingEstimateLabel}</DetailRow>
              {order.trackingNumber && (
                <DetailRow label="کد رهگیری">
                  <span dir="ltr">{toPersianDigits(order.trackingNumber)}</span>
                </DetailRow>
              )}
            </dl>
            {order.deliveryNotes && (
              <p className="m-0 mt-3 rounded-[var(--radius-sm)] bg-bg px-3 py-2 text-[0.82rem] leading-6 text-ink/85">
                <span className="font-semibold">توضیح تحویل: </span>
                {order.deliveryNotes}
              </p>
            )}
            {order.customerNote && (
              <p className="m-0 mt-3 rounded-[var(--radius-sm)] bg-bg px-3 py-2 text-[0.82rem] leading-6 text-ink/85">
                <span className="font-semibold">یادداشت مشتری: </span>
                {order.customerNote}
              </p>
            )}
            {order.cancelReason && (
              <p className="m-0 mt-3 rounded-[var(--radius-sm)] bg-blush px-3 py-2 text-[0.82rem] leading-6 text-[#9b2c2c]">
                <span className="font-semibold">دلیل لغو: </span>
                {order.cancelReason}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
