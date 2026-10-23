import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { logoutAction } from "@/domains/auth/actions";
import { ChevronLeftIcon } from "@/components/ui/icons";
import {
  DashboardAddressesIcon,
  DashboardLogoutIcon,
  DashboardOrdersIcon,
  DashboardUserIcon,
  DashboardWishlistIcon,
} from "@/components/ui/dashboard-icons";
import { formatIranianMobileForDisplay } from "@/lib/utils/phone";
import { toPersianDigits } from "@/lib/utils/persian-digits";

const MENU: Array<{ href: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = [
  { href: "/account/profile", label: "پروفایل", Icon: DashboardUserIcon },
  { href: "/account/addresses", label: "آدرس‌ها", Icon: DashboardAddressesIcon },
  { href: "/account/orders", label: "سفارش‌های من", Icon: DashboardOrdersIcon },
  { href: "/account/wishlist", label: "علاقه‌مندی‌ها", Icon: DashboardWishlistIcon },
];

const ROW =
  "flex min-h-[58px] w-full items-center gap-3.5 px-4 text-start text-[0.97rem] transition-colors duration-200 active:bg-ink/5";

/**
 * Mobile-only home of the account area (`/account` below `lg`): a hero with
 * the customer's name, mobile number and three counters, then the list of
 * account sections and the logout button. The desktop dashboard is a
 * different block on the same page and is hidden on phones.
 *
 * Counters come from the caller's user-scoped queries. «مرجوعی‌ها» counts
 * orders in the `refunded` state — the shop has no separate product-return
 * flow yet, so that is the closest record of a returned purchase.
 */
export function MobileAccountHome({
  fullName,
  mobile,
  orderCount,
  returnCount,
  wishlistCount,
}: {
  fullName: string | null;
  mobile: string;
  orderCount: number;
  returnCount: number;
  wishlistCount: number;
}) {
  const initial = fullName ? Array.from(fullName.trim())[0] : null;
  const stats = [
    { label: "سفارش‌ها", value: orderCount },
    { label: "مرجوعی‌ها", value: returnCount },
    { label: "علاقه‌مندی‌ها", value: wishlistCount },
  ];

  return (
    <div className="flex flex-col gap-5 lg:hidden">
      <section
        aria-label="خلاصه حساب"
        className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-gradient-to-br from-[#f7f0fc] to-[#ede1f7] shadow-[0_18px_40px_-26px_rgba(24,38,48,0.35)]"
      >
        <div className="flex items-center gap-4 p-5">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-[1.6rem] font-bold text-brand shadow-[0_8px_20px_-10px_rgba(91,15,165,0.6)] ring-1 ring-brand/15"
          >
            {initial ?? <DashboardUserIcon className="h-8 w-8 text-ink" />}
          </span>
          <div className="min-w-0">
            <h1 className="m-0 truncate text-[1.15rem] font-bold">{fullName ?? "کاربر عزیز"}</h1>
            <p dir="ltr" className="m-0 mt-1 truncate text-right text-[0.9rem] text-text-secondary">
              {toPersianDigits(formatIranianMobileForDisplay(mobile))}
            </p>
          </div>
        </div>
        <dl className="m-0 grid grid-cols-3 divide-x divide-x-reverse divide-line border-t border-line bg-white/60">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 px-2 py-3.5 text-center">
              <dd className="m-0 order-1 text-[1.35rem] leading-none font-bold">{toPersianDigits(stat.value)}</dd>
              <dt className="order-2 text-[0.78rem] text-text-secondary">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <nav
        aria-label="منوی حساب کاربری"
        className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white shadow-[0_14px_34px_-24px_rgba(24,38,48,0.3)]"
      >
        <ul className="m-0 list-none divide-y divide-line p-0">
          {MENU.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} className={`${ROW} text-ink`}>
                <Icon className="h-[24px] w-[24px] shrink-0 text-ink" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <ChevronLeftIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-text-secondary" />
              </Link>
            </li>
          ))}
          <li>
            <form action={logoutAction}>
              <button type="submit" className={`${ROW} cursor-pointer border-0 bg-transparent text-red-600`}>
                <DashboardLogoutIcon className="h-[24px] w-[24px] shrink-0 text-red-600" aria-hidden="true" />
                <span className="flex-1">خروج از حساب کاربری</span>
              </button>
            </form>
          </li>
        </ul>
      </nav>
    </div>
  );
}
