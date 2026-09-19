"use client";

import { useState } from "react";
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Container } from "@/components/ui/Container";
import { CartIcon, AccountIcon, SearchIcon } from "@/components/ui/icons";
import { useUIOverlay } from "@/components/overlays/UIOverlayProvider";
import { useCart } from "@/components/cart/CartProvider";
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
  const { openSearch, openCart } = useUIOverlay();
  const { cart } = useCart();
  const cartCount = cart.itemCount;
  const { data: session } = useSession();
  // `session === undefined` briefly (before the client fetches
  // `/api/auth/session`) is treated the same as "logged out" for this
  // icon — see `AuthSessionProvider`'s comment on the tradeoff.
  const accountHref = session?.user ? "/account" : "/login";

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
          <Form action="/search" role="search" className="relative">
            <label htmlFor="header-search" className="sr-only">
              جستجو در ترندز
            </label>
            <input
              id="header-search"
              type="search"
              name="q"
              required
              autoComplete="off"
              enterKeyHint="search"
              maxLength={100}
              placeholder="نام محصول یا دسته را جستجو کنید..."
              className="h-[48px] w-full rounded-full border border-line bg-white ps-6 pe-14 text-[0.95rem] text-ink placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-ink"
            />
            <button
              type="submit"
              aria-label="جستجو"
              className="absolute inset-y-1 end-1 flex w-[40px] items-center justify-center rounded-full transition-colors duration-200 hover:bg-ink/6"
            >
              <SearchIcon className="h-[24px] w-[24px] text-ink" />
            </button>
          </Form>

          {/* The row runs down to the header's bottom edge, so the menu
              panel (positioned at the header's bottom) is reachable by
              the pointer with no dead gap in between. */}
          <nav aria-label="ناوبری اصلی" className="flex h-[48px] items-stretch justify-center gap-14">
            <CategoryMegaMenu categories={categories} />
          </nav>
        </div>

        {/* Actions — right column on desktop. */}
        <div className="flex items-center gap-2 lg:col-start-1 lg:row-start-1 lg:justify-self-start lg:gap-3">
          <button
            type="button"
            aria-label="سبد خرید"
            aria-haspopup="true"
            onClick={openCart}
            className={ICON_BUTTON}
          >
            <CartIcon className={ICON} />
            {cartCount > 0 && (
              <span className="absolute top-0.5 left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-0.5 text-[0.62rem] leading-none text-white lg:top-1 lg:left-1 lg:h-[18px] lg:min-w-[18px] lg:text-[0.68rem]">
                {toPersianDigits(cartCount)}
              </span>
            )}
          </button>
          <Link
            href={accountHref}
            aria-label={session?.user ? "حساب کاربری" : "ورود به حساب کاربری"}
            className={ICON_BUTTON}
          >
            <AccountIcon className={ICON} />
          </Link>
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
