"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ComponentType, SVGProps } from "react";
import { AccountIcon, CartIcon, HomeIcon, LayoutGridIcon } from "@/components/ui/icons";
import { useCart } from "@/components/cart/CartProvider";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type Item = {
  key: string;
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  active: boolean;
  badge?: number;
};

/**
 * Bottom navigation bar for phones and small tablets (below `lg`; the
 * desktop layout never renders it). Four tabs. The page is RTL, so the DOM
 * order is also the visual order starting from the right: home, categories,
 * cart, profile (right to left).
 *
 * The profile tab goes to `/account` for signed-in visitors and to `/login`
 * otherwise (`session` is `undefined` for a moment before the client has
 * fetched it, which is treated as signed-out, like the header does).
 *
 * The trailing spacer reserves the bar's height at the end of the page so
 * the footer is never hidden behind it. Both are removed on `/admin` by
 * `StoreChrome`.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { cart } = useCart();

  const isUnder = (base: string) => pathname === base || pathname.startsWith(`${base}/`);

  const items: Item[] = [
    { key: "home", href: "/", label: "خانه", Icon: HomeIcon, active: pathname === "/" },
    {
      key: "categories",
      href: "/categories",
      label: "دسته‌بندی‌ها",
      Icon: LayoutGridIcon,
      active: pathname === "/categories" || isUnder("/category"),
    },
    {
      key: "cart",
      href: "/checkout",
      label: "سبد خرید",
      Icon: CartIcon,
      active: isUnder("/checkout"),
      badge: cart.itemCount,
    },
    {
      key: "profile",
      href: session?.user ? "/account" : "/login",
      label: "پروفایل",
      Icon: AccountIcon,
      active: isUnder("/account") || pathname === "/login" || pathname === "/register",
    },
  ];

  return (
    <>
      <nav
        aria-label="ناوبری اصلی موبایل"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-header-bg pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
      >
        <ul className="m-0 mx-auto flex max-w-[560px] list-none p-0">
          {items.map(({ key, href, label, Icon, active, badge }) => (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-[60px] flex-col items-center justify-center gap-1 text-[0.72rem] leading-none transition-colors duration-200 ${
                  active ? "font-semibold text-brand" : "text-ink"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-[30%] top-0 h-[3px] rounded-b-full bg-brand transition-opacity duration-200 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span className="relative">
                  <Icon aria-hidden="true" stroke="currentColor" strokeWidth={active ? 1.6 : 1.3} className="h-[26px] w-[26px]" />
                  {badge ? (
                    <span className="absolute -top-1.5 -start-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[0.62rem] leading-none font-semibold text-white">
                      {toPersianDigits(badge)}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div aria-hidden="true" className="h-[calc(60px+env(safe-area-inset-bottom,0px))] lg:hidden" />
    </>
  );
}
