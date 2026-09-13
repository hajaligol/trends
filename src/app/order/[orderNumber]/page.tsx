import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { getCurrentUser } from "@/domains/auth/actions";
import { getOrderForUser, getOrderStatusHistoryForUser } from "@/domains/orders/queries";
import { canCustomerCancel, ORDER_STATUS_LABELS } from "@/domains/orders/lifecycle";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { RetryPaymentButton } from "@/components/orders/RetryPaymentButton";
import { CancelOrderButton } from "@/components/orders/CancelOrderButton";

export const metadata: Metadata = {
  title: "سفارش من",
  robots: { index: false, follow: false },
};

const STATUS_LABELS = ORDER_STATUS_LABELS;

/** Banner shown right after returning from the (mock, currently — see
 * `src/domains/payments/provider.ts`) payment gateway, driven by the
 * `?payment=` query param the callback route redirects with. This is
 * purely a friendly status message — the order's actual `status` column
 * (already updated server-side by the time this page renders, since the
 * callback's `finalizePaymentVerification` runs before its redirect) is
 * always what's displayed for real, not this banner. */
const PAYMENT_RESULT_BANNERS: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  success: { tone: "success", text: "پرداخت شما با موفقیت انجام و تأیید شد." },
  failed: { tone: "error", text: "پرداخت ناموفق بود یا لغو شد. می‌توانید دوباره تلاش کنید." },
  "already-processed": { tone: "info", text: "این پرداخت قبلاً پردازش شده است." },
};

const BANNER_CLASSES: Record<"success" | "error" | "info", string> = {
  success: "bg-[#D2D9BF]/60 text-ink",
  error: "bg-red-50 text-red-700",
  info: "bg-ink/[0.05] text-ink",
};

/**
 * `getOrderForUser` is ownership-scoped by `userId` (same shape as
 * `addresses/queries.ts`) — a signed-in customer requesting someone
 * else's `orderNumber` gets `notFound()`, not someone else's order data,
 * per TRENDS_PROJECT_CONTEXT.md §11 "Account ownership checks exist".
 */
export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { orderNumber } = await params;
  const { payment } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const order = await getOrderForUser(orderNumber, user.id);
  if (!order) notFound();

  const statusHistory = await getOrderStatusHistoryForUser(orderNumber, user.id);

  const paymentBanner = payment ? PAYMENT_RESULT_BANNERS[payment] : null;

  return (
    <main className="py-[clamp(40px,7vw,80px)]">
      <Container className="mx-auto flex max-w-[720px] flex-col gap-8">
        <div className="text-center">
          <h1 className="m-0 text-[1.5rem] font-bold">سفارش شما ثبت شد</h1>
          <p className="mt-2 text-[0.92rem] text-text-secondary">
            شماره سفارش: <span dir="ltr" className="font-semibold text-ink">{order.orderNumber}</span>
          </p>
        </div>

        {paymentBanner && (
          <p
            role={paymentBanner.tone === "error" ? "alert" : "status"}
            className={`rounded-[var(--radius-md)] px-4 py-3 text-center text-[0.88rem] ${BANNER_CLASSES[paymentBanner.tone]}`}
          >
            {paymentBanner.text}
          </p>
        )}

        {order.status === "pending_payment" && (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] bg-[#FBE1B4]/50 px-4 py-3 text-center text-[0.88rem] text-ink">
            <p>
              درگاه پرداخت آنلاین هنوز تکمیل نشده است؛ این سفارش در وضعیت «در انتظار پرداخت» قرار دارد.
            </p>
            <RetryPaymentButton orderNumber={order.orderNumber} />
          </div>
        )}

        {canCustomerCancel(order.status) && (
          <div className="flex justify-center">
            <CancelOrderButton orderNumber={order.orderNumber} />
          </div>
        )}

        {order.status === "cancelled" && order.cancelReason && (
          <p className="rounded-[var(--radius-md)] bg-ink/[0.05] px-4 py-3 text-center text-[0.85rem] text-text-secondary">
            دلیل لغو: {order.cancelReason}
          </p>
        )}

        <section className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="m-0 text-[1.05rem] font-bold">اقلام سفارش</h2>
            <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-[0.8rem] text-ink">
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-[0.88rem]">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[8px] bg-card-image">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.productTitle} fill sizes="56px" className="object-cover" />
                  ) : (
                    <AssetSlot label={item.productTitle} rounded="none" className="h-full w-full" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{item.productTitle}</p>
                  <p className="text-text-secondary">
                    {item.size} / {item.color} × {toPersianDigits(item.quantity)}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-ink">{formatToman(item.lineTotalToman)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 text-[0.88rem]">
            <h2 className="mb-3 text-[1rem] font-bold">آدرس ارسال</h2>
            <p className="font-semibold text-ink">{order.recipientName}</p>
            <p dir="ltr" className="text-right text-text-secondary">
              {toPersianDigits(order.recipientMobile.replace("+98", "0"))}
            </p>
            <p className="text-text-secondary">
              {order.province}، {order.city}، {order.addressLine}
              {order.plaqueUnitDetails ? `، ${order.plaqueUnitDetails}` : ""}
            </p>
            <p className="text-text-secondary">کد پستی: {toPersianDigits(order.postalCode)}</p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 text-[0.88rem]">
            <h2 className="mb-3 text-[1rem] font-bold">روش ارسال و پرداخت</h2>
            <p className="text-ink">{order.shippingMethodLabel}</p>
            <p className="mb-3 text-text-secondary">{order.shippingEstimateLabel}</p>
            {order.trackingNumber && (
              <p className="mb-3 text-text-secondary">
                کد رهگیری مرسوله: <span dir="ltr">{toPersianDigits(order.trackingNumber)}</span>
              </p>
            )}
            <div className="flex flex-col gap-1 border-t border-line pt-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">جمع کالاها</span>
                <span>{formatToman(order.subtotalToman)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">هزینه ارسال</span>
                <span>{order.shippingFeeToman === 0 ? "رایگان" : formatToman(order.shippingFeeToman)}</span>
              </div>
              {order.discountToman > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">
                    تخفیف {order.couponCode ? `(${order.couponCode})` : ""}
                  </span>
                  <span>−{formatToman(order.discountToman)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-1 font-bold">
                <span>مبلغ نهایی</span>
                <span>{formatToman(order.totalToman)}</span>
              </div>
            </div>
          </div>
        </section>

        {statusHistory.length > 0 && (
          <section className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
            <h2 className="mb-4 text-[1.05rem] font-bold">روند سفارش</h2>
            <ol className="flex flex-col gap-3">
              {statusHistory.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 text-[0.85rem]">
                  <span className="text-ink">{STATUS_LABELS[entry.toStatus] ?? entry.toStatus}</span>
                  <span className="text-text-secondary">
                    {toPersianDigits(
                      new Intl.DateTimeFormat("fa-IR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(entry.createdAt),
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <Link href="/" className="text-center text-[0.88rem] font-semibold text-ink underline underline-offset-2">
          بازگشت به فروشگاه
        </Link>
      </Container>
    </main>
  );
}
