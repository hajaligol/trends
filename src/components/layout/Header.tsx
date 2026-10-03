"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Container } from "@/components/ui/Container";
import {
  CartIcon,
  AccountIcon,
  ClipboardListIcon,
  HeartIcon,
  LogOutIcon,
  SearchIcon,
  UserRoundIcon,
} from "@/components/ui/icons";
import { useUIOverlay } from "@/components/overlays/UIOverlayProvider";
import { useCart } from "@/components/cart/CartProvider";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { CategoryMegaMenu } from "@/components/layout/CategoryMegaMenu";
import { MobileCategoryMenu } from "@/components/layout/MobileCategoryMenu";
import type { NavCategory } from "@/domains/categories/tree";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * Site header.
 *
 * **Desktop (lg and up) — three columns**, laid out by physical side:
 *   - left:   the brand logo, and nothing else;
 *   - centre: two rows — a wide search box, and beneath it the category
 *             menu (مردانه / زنانه / بچگانه, each opening its menu of
 *             groups and types);
 *   - right:  the cart and account buttons.
 * The columns use equal side tracks so the centre column is truly
 * centred. The page is RTL, where grid column 1 is the right-hand one, so
 * the explicit `lg:col-start-*` values below put the actions in column 1
 * (right), the centre in column 2 and the logo in column 3 (left). To
 * swap the logo and the buttons, swap `lg:col-start-1` and `lg:col-start-3`.
 *
 * **Below lg — a compact single bar** (logo, search icon that opens the
 * search overlay, cart, account, and a hamburger for the category
 * accordion): a two-row 120px header would be too much of a phone
 * screen.
 *
 * The home / shop / about links that used to sit here are gone: the logo
 * is the home link, and the footer carries the rest.
 */

const ICON_BUTTON =
  "relative flex h-[46px] w-[46px] items-center justify-center rounded-full bg-transparent transition-colors duration-200 hover:bg-ink/6 lg:h-[56px] lg:w-[56px]";
const ICON = "h-[28px] w-[28px] text-ink lg:h-[36px] lg:w-[36px]";

export function Header({ categories }: { categories: NavCategory[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { openSearch, isHeaderDimmed } = useUIOverlay();
  const { cart } = useCart();
  const cartCount = cart.itemCount;
  const { data: session } = useSession();
  // `session === undefined` briefly (before the client fetches
  // `/api/auth/session`) is treated the same as "logged out" for this
  // icon — see `AuthSessionProvider`'s comment on the tradeoff.
  const accountHref = session?.user ? "/account" : "/login";
  // First word of the full name ("علی رضایی" -> "علی"); falls back to a
  // neutral word if the account has no name.
  const greetingName = session?.user?.name?.trim().split(/\s+/)[0] || "کاربر";

  const closeMenu = () => setMenuOpen(false);

  // `relative` on the <header> is required, not cosmetic: the category menu
  // panel (CategoryMegaMenu) is `absolute inset-x-0 top-full` and anchors to
  // the nearest positioned ancestor, which is this header. With no
  // positioning at all it anchors to the page instead and never appears
  // under the header. To keep the header on screen while scrolling, use
  // `sticky top-0` in place of `relative` (also positioned, so the menu
  // keeps working).
  return (
    <header className="relative z-40 border-b border-line bg-header-bg">
      {/* Dims the header bar while the search dropdown is open (the page
          below is dimmed by PageDim). z-[45] sits above the header's own
          content but below the search box (z-[51]) and dropdown (z-50), and
          below the mega menu panel (z-[46]) in case both are open. Purely
          visual, so it never blocks clicks. `-bottom-px` extends it over the
          header's 1px bottom border, which `inset-0` alone would leave bright. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 -bottom-px z-[45] bg-ink/35 transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${
          isHeaderDimmed ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />
      <Container className="flex min-h-[68px] items-center justify-between gap-4 lg:grid lg:min-h-0 lg:grid-cols-[1fr_minmax(0,2.4fr)_1fr] lg:items-center lg:gap-x-8">
        {/* Logo — left column on desktop. */}
        <Link
          href="/"
          aria-label="ترندز — صفحه اصلی"
          className="shrink-0 lg:col-start-3 lg:row-start-1 lg:justify-self-end"
        >
          <Image
            src="/assets/brand/logo.webp"
            alt="ترندز"
            width={1536}
            height={1024}
            // The source is 1536px wide but shown ~126px wide: `sizes`
            // makes Next pick a small generated variant instead of the
            // full-size file.
            sizes="(min-width: 1024px) 130px, 72px"
            priority
            className="h-12 w-auto lg:h-[84px]"
          />
        </Link>

        {/* Centre column (desktop only): search box, then category menu. */}
        <div className="hidden lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-1.5 lg:pt-3">
          <HeaderSearch />

          {/* The row runs down to the header's bottom edge, so the menu
              panel (positioned at the header's bottom) is reachable by
              the pointer with no dead gap in between. */}
          <nav aria-label="ناوبری اصلی" className="flex h-[48px] items-stretch justify-center gap-7">
            <CategoryMegaMenu categories={categories} />
          </nav>
        </div>

        {/* Actions — right column on desktop. */}
        <div className="flex items-center gap-2 lg:col-start-1 lg:row-start-1 lg:justify-self-start lg:gap-3">
          <Link href="/checkout" aria-label="سبد خرید" className={ICON_BUTTON}>
            <CartIcon className={ICON} />
            {cartCount > 0 && (
              <span className="absolute top-0.5 left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-0.5 text-[0.62rem] leading-none text-white lg:top-1 lg:left-1 lg:h-[18px] lg:min-w-[18px] lg:text-[0.68rem]">
                {toPersianDigits(cartCount)}
              </span>
            )}
          </Link>
          {/* Wishlist — logged-in users only; sits between the cart and the
              account button. */}
          {session?.user && (
            <Link href="/account/wishlist" aria-label="علاقه‌مندی‌ها" className={ICON_BUTTON}>
              <HeartIcon className={ICON} />
            </Link>
          )}
          {/* Account button.
              - Logged in: no capsule — the account icon (same size as the
                cart icon) followed by "<first name> عزیز". Below `sm` only
                the icon shows so the compact mobile bar does not overflow.
              - Logged out: brand-purple capsule with the login prompt only. */}
          {session?.user ? (
            // Account button + dropdown. The menu opens on hover and on
            // keyboard focus (desktop, `lg` and up only — below that the
            // button is a plain link to /account, which has its own nav).
            // The panel's `pt-2` wrapper bridges the gap under the button so
            // the pointer never leaves the hover area on its way down.
            <div
              className="relative"
              onMouseEnter={() => setAccountMenuOpen(true)}
              onMouseLeave={() => setAccountMenuOpen(false)}
              onFocus={() => setAccountMenuOpen(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setAccountMenuOpen(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setAccountMenuOpen(false);
              }}
            >
              <Link
                href={accountHref}
                aria-label={`حساب کاربری ${greetingName}`}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen(false)}
                className="flex h-[46px] items-center justify-center gap-1.5 rounded-full bg-transparent px-[9px] transition-colors duration-200 hover:bg-ink/6 lg:h-[56px] lg:gap-2 lg:px-3"
              >
                <AccountIcon className={`${ICON} shrink-0`} />
                <span className="hidden max-w-[150px] truncate text-[0.92rem] font-semibold leading-none text-ink sm:inline lg:text-[1rem]">
                  {greetingName} عزیز
                </span>
              </Link>

              {/* Always mounted so it animates both ways, like the mega menus
                  and the search panel. `invisible` keeps it out of the tab
                  order and out of hit-testing while closed. */}
              <div
                aria-hidden={!accountMenuOpen}
                className={`absolute start-0 top-full z-50 hidden origin-top pt-2 transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none lg:block ${
                  accountMenuOpen
                    ? "visible translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none invisible -translate-y-2 scale-[0.97] opacity-0"
                }`}
              >
                  <div
                    role="menu"
                    aria-label="منوی حساب کاربری"
                    className="w-[210px] overflow-hidden rounded-[14px] border border-line bg-white py-2 shadow-[0_12px_32px_rgba(24,38,48,0.12)]"
                  >
                    <Link
                      href="/account"
                      role="menuitem"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[0.92rem] text-ink transition-colors hover:bg-ink/5"
                    >
                      <UserRoundIcon className="h-[20px] w-[20px] shrink-0" />
                      حساب کاربری
                    </Link>
                    <Link
                      href="/account/orders"
                      role="menuitem"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[0.92rem] text-ink transition-colors hover:bg-ink/5"
                    >
                      <ClipboardListIcon className="h-[20px] w-[20px] shrink-0" />
                      سفارش‌ها
                    </Link>
                    <div className="my-1 border-t border-line" />
                    {/* Client-side sign-out with a full reload: also works when
                        the visitor is already on "/", where a route change
                        would not happen and the header would keep the name. */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        void signOut({ callbackUrl: "/" });
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-[0.92rem] text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOutIcon className="h-[20px] w-[20px] shrink-0" />
                      خروج از حساب کاربری
                    </button>
                  </div>
                </div>
            </div>
          ) : (
            <Link
              href={accountHref}
              className="flex h-[38px] items-center justify-center whitespace-nowrap rounded-full bg-brand px-3.5 text-[0.78rem] font-semibold leading-none text-white transition-colors duration-200 hover:bg-brand-dark sm:h-[40px] sm:px-5 sm:text-[0.88rem] lg:h-[46px] lg:px-6 lg:text-[0.95rem]"
            >
              ورود / ثبت‌نام
            </Link>
          )}
          <button
            type="button"
            aria-label="جستجو"
            aria-haspopup="true"
            onClick={openSearch}
            className={`${ICON_BUTTON} lg:hidden`}
          >
            <SearchIcon className={ICON} />
          </button>
          <button
            type="button"
            aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-[38px] w-[38px] flex-col items-center justify-center gap-1 rounded-full bg-transparent lg:hidden"
          >
            <span
              className={`h-0.5 w-[18px] rounded-sm bg-ink transition-transform duration-200 ${
                menuOpen ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`h-0.5 w-[18px] rounded-sm bg-ink transition-opacity duration-200 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-0.5 w-[18px] rounded-sm bg-ink transition-transform duration-200 ${
                menuOpen ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </Container>

      {/* Mobile/tablet category accordion (categories only). */}
      {menuOpen && (
        <nav
          aria-label="ناوبری موبایل"
          className="flex max-h-[calc(100vh-68px)] flex-col overflow-y-auto border-t border-line bg-header-bg px-(--gutter) py-2 lg:hidden"
        >
          <MobileCategoryMenu categories={categories} onNavigate={closeMenu} />
        </nav>
      )}
    </header>
  );
}
