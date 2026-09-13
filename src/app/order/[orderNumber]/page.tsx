import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { getCurrentUser } from "@/domains/auth/actions";
import { getOrderForUser } from "@/domains/orders/queries";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "سفارش من",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال‌شده",
  delivered: "تحویل داده‌شده",
  cancelled: "لغو‌شده",
  refunded: "بازپرداخت‌شده",
};

/**
 * `getOrderForUser` is ownership-scoped by `userId` (same shape as
 * `addresses/queries.ts`) — a signed-in customer requesting someone
 * else's `orderNumber` gets `notFound()`, not someone else's order data,
 * per TRENDS_PROJECT_CONTEXT.md §11 "Account ownership checks exist".
 */
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const order = await getOrderForUser(orderNumber, user.id);
  if (!order) notFound();

  return (
    <main className="py-[clamp(40px,7vw,80px)]">
      <Container className="mx-auto flex max-w-[720px] flex-col gap-8">
        <div className="text-center">
          <h1 className="m-0 text-[1.5rem] font-bold">سفارش شما ثبت شد</h1>
          <p className="mt-2 text-[0.92rem] text-text-secondary">
            شماره سفارش: <span dir="ltr" className="font-semibold text-ink">{order.orderNumber}</span>
          </p>
        </div>

        {order.status === "pending_payment" && (
          <p className="rounded-[var(--radius-md)] bg-[#FBE1B4]/50 px-4 py-3 text-center text-[0.88rem] text-ink">
            درگاه پرداخت آنلاین هنوز پیکربندی نشده است؛ این سفارش در وضعیت «در انتظار پرداخت» ثبت شده و پس از
            راه‌اندازی درگاه پرداخت تکمیل خواهد شد.
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
            <div className="flex flex-col gap-1 border-t border-line pt-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">جمع کالاها</span>
                <span>{formatToman(order.subtotalToman)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">هزینه ارسال</span>
                <span>{order.shippingFeeToman === 0 ? "رایگان" : formatToman(order.shippingFeeToman)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-bold">
                <span>مبلغ نهایی</span>
                <span>{formatToman(order.totalToman)}</span>
              </div>
            </div>
          </div>
        </section>

        <Link href="/" className="text-center text-[0.88rem] font-semibold text-ink underline underline-offset-2">
          بازگشت به فروشگاه
        </Link>
      </Container>
    </main>
  );
}
