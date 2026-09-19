"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Container } from "@/components/ui/Container";
import { CartIcon, AccountIcon, SearchIcon } from "@/components/ui/icons";
import { useUIOverlay } from "@/components/overlays/UIOverlayProvider";
import { useCart } from "@/components/cart/CartProvider";
import { CategoryMegaMenu } from "@/components/layout/CategoryMegaMenu";
import { MobileCategoryMenu } from "@/components/layout/MobileCategoryMenu";
import { navLinkClass } from "@/components/layout/nav-styles";
import type { NavCategory } from "@/domains/categories/tree";
import { toPersianDigits } from "@/lib/utils/persian-digits";

// Nav mirrors reference/prototype.html .main-nav / .mobile-nav, with the
// category links now driven by the real three-level category tree
// (مردانه / زنانه / بچگانه, each opening a menu of groups and types — see
// `CategoryMegaMenu` / `MobileCategoryMenu`) instead of hardcoded
// /category/men, /category/women, /category/accessories entries.
// "صفحه اصلی" points at "/" so it works as a home link from any page;
// "فروشگاه" stays on the homepage's #featured anchor — there's no
// all-categories catalog page in scope.
type PlainLink = { href: string; label: string };

const LEADING_LINKS: PlainLink[] = [
  { href: "/", label: "صفحه اصلی" },
  { href: "#featured", label: "فروشگاه" },
];
const TRAILING_LINKS: PlainLink[] = [{ href: "#site-footer", label: "درباره ما" }];
const SECTION_LINKS = [...LEADING_LINKS, ...TRAILING_LINKS];

function renderDesktopLink(link: PlainLink, key: string, activeId: string) {
  const className = navLinkClass(activeId === link.href.replace("#", ""));
  return (
    <div key={key} className="flex items-center">
      {link.href.startsWith("/") ? (
        <Link href={link.href} className={className}>
          {link.label}
        </Link>
      ) : (
        <a href={link.href} className={className}>
          {link.label}
        </a>
      )}
    </div>
  );
}

function renderMobileLink(link: PlainLink, key: string, onNavigate: () => void) {
  const className = "rounded-md px-2 py-2.5 text-[0.95rem] text-ink hover:bg-ink/5";
  return link.href.startsWith("/") ? (
    <Link key={key} href={link.href} onClick={onNavigate} className={className}>
      {link.label}
    </Link>
  ) : (
    <a key={key} href={link.href} onClick={onNavigate} className={className}>
      {link.label}
    </a>
  );
}

export function Header({ categories }: { categories: NavCategory[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("hero");
  const { openSearch, openCart } = useUIOverlay();
  const { cart } = useCart();
  const cartCount = cart.itemCount;
  const { data: session } = useSession();
  // `session === undefined` briefly (before the client fetches
  // `/api/auth/session`) is treated the same as "logged out" for this
  // icon — see `AuthSessionProvider`'s comment on the tradeoff.
  const accountHref = session?.user ? "/account" : "/login";

  // Highlights the nav link for the section currently in view, mirroring
  // the prototype's scroll listener -- reimplemented with
  // IntersectionObserver instead of a window "scroll" handler. Only the
  // homepage currently has these section ids; on other routes this
  // simply finds nothing to observe.
  useEffect(() => {
    const sectionIds = Array.from(new Set(SECTION_LINKS.map((link) => link.href.replace("#", ""))));
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-header-bg">
      <Container className="flex min-h-[68px] items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <Image
            src="/assets/brand/logo.webp"
            alt="ترندز"
            width={1536}
            height={1024}
            priority
            className="h-11 w-auto"
          />
        </Link>

        <nav aria-label="ناوبری اصلی" className="hidden items-stretch gap-[30px] self-stretch lg:flex">
          {LEADING_LINKS.map((link, i) => renderDesktopLink(link, `lead-${i}`, activeId))}
          <CategoryMegaMenu categories={categories} />
          {TRAILING_LINKS.map((link, i) => renderDesktopLink(link, `trail-${i}`, activeId))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="سبد خرید"
            aria-haspopup="true"
            onClick={openCart}
            className="relative flex h-[46px] w-[46px] items-center justify-center rounded-full bg-transparent transition-colors duration-200 hover:bg-ink/6"
          >
            <CartIcon className="h-[30px] w-[30px] text-ink" />
            {cartCount > 0 && (
              <span className="absolute top-0.5 left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-0.5 text-[0.62rem] leading-none text-white">
                {toPersianDigits(cartCount)}
              </span>
            )}
          </button>
          <Link
            href={accountHref}
            aria-label={session?.user ? "حساب کاربری" : "ورود به حساب کاربری"}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-transparent transition-colors duration-200 hover:bg-ink/6"
          >
            <AccountIcon className="h-[30px] w-[30px] text-ink" />
          </Link>
          <button
            type="button"
            aria-label="جستجو"
            aria-haspopup="true"
            onClick={openSearch}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-transparent transition-colors duration-200 hover:bg-ink/6"
          >
            <SearchIcon className="h-[30px] w-[30px] text-ink" />
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

      <nav
        aria-label="ناوبری موبایل"
        className={`flex-col gap-1 border-t border-line bg-header-bg px-(--gutter) py-2 lg:hidden ${
          menuOpen ? "flex" : "hidden"
        }`}
      >
        {LEADING_LINKS.map((link, i) => renderMobileLink(link, `lead-${i}`, closeMenu))}
        {menuOpen && <MobileCategoryMenu categories={categories} onNavigate={closeMenu} />}
        {TRAILING_LINKS.map((link, i) => renderMobileLink(link, `trail-${i}`, closeMenu))}
      </nav>
    </header>
  );
}
