"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  DashboardAddressesIcon,
  DashboardOrdersIcon,
  DashboardUserIcon,
  DashboardWishlistIcon,
} from "@/components/ui/dashboard-icons";

const ITEMS = [
  { href: "/account", label: "حساب کاربری", Icon: DashboardUserIcon, exact: true },
  { href: "/account/addresses", label: "آدرس‌ها", Icon: DashboardAddressesIcon, exact: false },
  { href: "/account/orders", label: "سفارش‌های من", Icon: DashboardOrdersIcon, exact: false },
  { href: "/account/wishlist", label: "علاقه‌مندی‌ها", Icon: DashboardWishlistIcon, exact: false },
] as const;

/**
 * Dashboard navigation. A vertical list on desktop; on small screens it
 * becomes a horizontally scrollable row of pills. `children` is the logout
 * form (a server action form rendered by the layout), shown as the last item.
 */
export function AccountNav({ children }: { children?: ReactNode }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="منوی حساب کاربری"
      className="flex gap-2 overflow-x-auto p-2.5 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-3"
    >
      {ITEMS.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[0.92rem] text-ink transition-colors duration-200 ${
              active ? "bg-lavender/60 font-semibold" : "hover:bg-ink/5"
            }`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-y-2 start-0 hidden w-1 rounded-full bg-brand lg:block"
              />
            )}
            <Icon className="h-[22px] w-[22px] shrink-0 text-ink" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <div className="shrink-0 lg:mt-2 lg:border-t lg:border-line lg:pt-3">{children}</div>
    </nav>
  );
}
