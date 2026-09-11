"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { CartIcon, AccountIcon, SearchIcon } from "@/components/ui/icons";
import { useUIOverlay } from "@/components/overlays/UIOverlayProvider";
import { demoCartItems } from "@/domains/cart/demo-data";
import { toPersianDigits } from "@/lib/utils/persian-digits";

// Nav links mirror reference/prototype.html .main-nav / .mobile-nav, with
// two Phase 4 updates: "مردان"/"زنان"/"اکسسوری‌ها" now point at their real
// /category/[slug] routes instead of the homepage's #categories anchor
// (which only ever made sense while those categories had no pages of
// their own), and "صفحه اصلی" points at "/" instead of "#hero" so it
// works as an actual home link from category/product pages too.
// "فروشگاه" stays on the homepage's #featured anchor — there's no
// all-categories catalog page in scope yet.
const NAV_LINKS = [
  { href: "/", label: "صفحه اصلی" },
  { href: "#featured", label: "فروشگاه" },
  { href: "/category/men", label: "مردان" },
  { href: "/category/women", label: "زنان" },
  { href: "/category/accessories", label: "اکسسوری‌ها" },
  { href: "#site-footer", label: "درباره ما" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("hero");
  const { openSearch, openCart } = useUIOverlay();
  const cartCount = demoCartItems.length;

  // Highlights the nav link for the section currently in view, mirroring
  // the prototype's scroll listener -- reimplemented with
  // IntersectionObserver instead of a window "scroll" handler. Only the
  // homepage currently has these section ids; on other routes this
  // simply finds nothing to observe.
  useEffect(() => {
    const sectionIds = Array.from(new Set(NAV_LINKS.map((link) => link.href.replace("#", ""))));
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

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-header-bg">
      <Container className="flex min-h-[68px] items-center justify-between gap-4">
        <span className="text-[1.55rem] font-bold tracking-wide whitespace-nowrap text-ink">
          ترندز
        </span>

        <nav aria-label="ناوبری اصلی" className="hidden items-center gap-[30px] lg:flex">
          {NAV_LINKS.map((link, i) => {
            const isActive = activeId === link.href.replace("#", "");
            const className = `relative py-1.5 text-[0.93rem] text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:rounded-sm after:bg-ink after:transition-transform after:duration-200 hover:after:scale-x-100 ${
              isActive ? "after:scale-x-100" : "after:scale-x-0"
            }`;
            return link.href.startsWith("/") ? (
              <Link key={`${link.href}-${i}`} href={link.href} className={className}>
                {link.label}
              </Link>
            ) : (
              <a key={`${link.href}-${i}`} href={link.href} className={className}>
                {link.label}
              </a>
            );
          })}
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
            <span className="absolute top-0.5 left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-0.5 text-[0.62rem] leading-none text-white">
              {toPersianDigits(cartCount)}
            </span>
          </button>
          <button
            type="button"
            aria-label="حساب کاربری"
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-transparent transition-colors duration-200 hover:bg-ink/6"
          >
            <AccountIcon className="h-[30px] w-[30px] text-ink" />
          </button>
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
        {NAV_LINKS.map((link, i) =>
          link.href.startsWith("/") ? (
            <Link
              key={`mobile-${link.href}-${i}`}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2.5 text-[0.95rem] text-ink hover:bg-ink/5"
            >
              {link.label}
            </Link>
          ) : (
            <a
              key={`mobile-${link.href}-${i}`}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2.5 text-[0.95rem] text-ink hover:bg-ink/5"
            >
              {link.label}
            </a>
          ),
        )}
      </nav>
    </header>
  );
}
