import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/domains/auth/actions";
import { findUserById } from "@/domains/auth/queries";
import { getAddressesForUser } from "@/domains/addresses/queries";
import { getOrderItemPreviews, listOrdersForUser } from "@/domains/orders/queries";
import { getWishlistedProductIds } from "@/domains/wishlist/queries";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { EmptyState } from "@/components/account/EmptyState";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { OrderThumbnails } from "@/components/account/OrderThumbnails";
import { formatPersianDate, formatPersianMonthYear } from "@/components/account/format";
import {
  DashboardAddressesIcon,
  DashboardOrdersIcon,
  DashboardUserIcon,
  DashboardWishlistIcon,
} from "@/components/ui/dashboard-icons";
import { formatToman } from "@/lib/utils/money";
import { formatIranianMobileForDisplay } from "@/lib/utils/phone";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata: Metadata = {
  title: "حساب کاربری",
  robots: { index: false, follow: false },
};

/** Orders that are still on their way to the customer. */
const IN_PROGRESS_STATUSES = new Set(["pending_payment", "paid", "processing", "shipped"]);

const CARD = "rounded-[var(--radius-lg)] border border-line bg-white shadow-[0_14px_34px_-24px_rgba(24,38,48,0.3)]";

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f6f3ee] text-ink"
      >
        {icon}
      </span>
      <div>
        <p className="m-0 text-[1.55rem] font-bold leading-none">{value}</p>
        <p className="m-0 mt-1.5 text-[0.85rem] text-text-secondary">{label}</p>
        {hint && <p className="m-0 mt-0.5 text-[0.75rem] text-text-secondary/80">{hint}</p>}
      </div>
    </>
  );
  const classes = `${CARD} flex flex-col gap-4 p-5`;
  return href ? (
    <Link
      href={href}
      className={`${classes} transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-22px_rgba(91,15,165,0.45)] motion-reduce:hover:translate-y-0`}
    >
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export default async function AccountPage() {
  // `getCurrentUser()` guarantees a session exists (enforced by the
  // parent layout), but the session/JWT payload only carries the small
  // set of fields attached in `src/lib/auth/config.ts`'s callbacks — this
  // page needs `createdAt`, so it re-reads the full row rather than
  // trusting the JWT for display-only account details.
  const sessionUser = await getCurrentUser();
  const user = sessionUser ? await findUserById(sessionUser.id) : null;
  if (!user) return null; // Layout already redirects if there's no session; defensive only.

  // Every query is scoped by the signed-in user's id.
  const [orders, addresses, wishlistIds] = await Promise.all([
    listOrdersForUser(user.id),
    getAddressesForUser(user.id),
    getWishlistedProductIds(user.id),
  ]);

  const inProgressCount = orders.filter((order) => IN_PROGRESS_STATUSES.has(order.status)).length;
  const recentOrders = orders.slice(0, 4); // already newest first
  // Ids come from the user-scoped read above, so previews are ownership-safe.
  const itemsByOrder = await getOrderItemPreviews(recentOrders.map((order) => order.id));

  const details: Array<{ label: string; value: ReactNode }> = [
    { label: "نام", value: user.fullName ?? "—" },
    {
      label: "شماره موبایل",
      value: (
        <span dir="ltr" className="inline-block">
          {toPersianDigits(formatIranianMobileForDisplay(user.mobile))}
        </span>
      ),
    },
    { label: "ایمیل", value: user.email ?? "—" },
    { label: "عضویت از", value: formatPersianDate(user.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AccountPageHeader
        icon={<DashboardUserIcon className="h-6 w-6" />}
        title="حساب کاربری"
        description="نمای کلی حساب، سفارش‌ها و اطلاعات شما"
      />

      {/* Welcome banner */}
      {/* <section className="relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-brand/15 bg-gradient-to-br from-[#f7f0fc] via-[#ede1f7] to-[#e2d4ec] p-[clamp(20px,3vw,32px)]">
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -end-10 -z-10 h-56 w-56 rounded-full bg-brand/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -start-10 -z-10 h-56 w-56 rounded-full bg-[#c79ae8]/45 blur-3xl" />
        <h2 className="m-0 mt-1 text-[clamp(1.3rem,2.6vw,1.8rem)] font-bold">
          {user.fullName ? ` ${user.fullName}` : ""} عزیز، خوش آمدید!
        </h2>
        <p className="m-0 mt-2 max-w-xl text-[0.92rem] leading-7 text-ink/75">
          {orders.length > 0
            ? inProgressCount > 0
              ? `${toPersianDigits(inProgressCount)} سفارش شما در حال پیگیری است.`
              : "همه سفارش‌های شما تکمیل شده است."
            : "هنوز سفارشی ثبت نکرده‌اید. از تازه‌ترین محصولات دیدن کنید."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            href="/"
            className="rounded-full bg-brand px-5 py-2 text-[0.9rem] font-semibold text-white shadow-lg shadow-brand/30 transition-colors duration-200 hover:bg-brand-dark"
          >
            ادامه خرید
          </Link>
          <Link
            href="/account/orders"
            className="rounded-full border border-brand/20 bg-white/80 px-5 py-2 text-[0.9rem] font-semibold text-ink transition-colors duration-200 hover:bg-white"
          >
            سفارش‌های من
          </Link>
        </div>
      </section> */}

      {/* Stats */}
      <section aria-label="خلاصه حساب" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          href="/account/orders"
          icon={<DashboardOrdersIcon className="h-6 w-6" />}
          label="سفارش‌ها"
          value={toPersianDigits(orders.length)}
          hint={inProgressCount > 0 ? `${toPersianDigits(inProgressCount)} در حال پیگیری` : undefined}
        />
        <StatCard
          href="/account/wishlist"
          icon={<DashboardWishlistIcon className="h-6 w-6" />}
          label="علاقه‌مندی‌ها"
          value={toPersianDigits(wishlistIds.length)}
        />
        <StatCard
          href="/account/addresses"
          icon={<DashboardAddressesIcon className="h-6 w-6" />}
          label="آدرس‌ها"
          value={toPersianDigits(addresses.length)}
        />
        <StatCard
          icon={<DashboardUserIcon className="h-6 w-6" />}
          label="عضویت از"
          value={formatPersianMonthYear(user.createdAt)}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <section className={`${CARD} p-5 lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="m-0 flex items-center gap-2.5 text-[1.05rem] font-bold">
              <DashboardOrdersIcon className="h-6 w-6 text-ink" aria-hidden="true" />
              آخرین سفارش‌ها
            </h2>
            {orders.length > 0 && (
              <Link href="/account/orders" className="text-[0.85rem] font-semibold text-brand hover:underline">
                مشاهده همه
              </Link>
            )}
          </div>

          {recentOrders.length === 0 ? (
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
            <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/order/${order.orderNumber}`}
                    className="-mx-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl px-2 py-3.5 transition-colors duration-200 hover:bg-ink/[0.03]"
                  >
                    <div className="flex items-center gap-3.5">
                      <OrderThumbnails items={itemsByOrder.get(order.id) ?? []} max={2} />
                      <div className="flex flex-col gap-1">
                        <span dir="ltr" className="text-right text-[0.92rem] font-semibold">
                          {order.orderNumber}
                        </span>
                        <span className="text-[0.8rem] text-text-secondary">{formatPersianDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <OrderStatusBadge status={order.status} />
                    <span className="text-[0.92rem] font-semibold">{formatToman(order.totalToman)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Account details */}
        <section className={`${CARD} p-5`}>
          <h2 className="m-0 mb-4 flex items-center gap-2.5 text-[1.05rem] font-bold">
            <DashboardUserIcon className="h-6 w-6 text-ink" aria-hidden="true" />
            اطلاعات حساب
          </h2>
          <dl className="m-0 flex flex-col divide-y divide-line">
            {details.map((item) => (
              <div key={item.label} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <dt className="text-[0.78rem] text-text-secondary">{item.label}</dt>
                <dd className="m-0 break-words text-[0.92rem] font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
