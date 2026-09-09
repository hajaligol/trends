"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { CartIcon, AccountIcon, SearchIcon } from "@/components/ui/icons";

// Nav links mirror reference/prototype.html .main-nav / .mobile-nav exactly.
// These point at homepage anchors for now (Phase 2 homepage sections); once
// category/product pages exist as real routes (Phase 4) "مردان" / "زنان" /
// "اکسسوری‌ها" should point at those routes instead of #categories/#collections.
const NAV_LINKS = [
  { href: "#hero", label: "صفحه اصلی" },
  { href: "#featured", label: "فروشگاه" },
  { href: "#categories", label: "مردان" },
  { href: "#collections", label: "زنان" },
  { href: "#categories", label: "اکسسوری‌ها" },
  { href: "#site-footer", label: "درباره ما" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-header-bg border-b border-line">
      <Container className="flex min-h-[68px] items-center justify-between gap-4">
        <span className="text-[1.55rem] font-bold tracking-wide text-ink whitespace-nowrap">
          ترندز
        </span>

        <nav
          aria-label="ناوبری اصلی"
          className="hidden lg:flex items-center gap-[30px]"
        >
          {NAV_LINKS.map((link, i) => (
            <a
              key={`${link.href}-${i}`}
              href={link.href}
              className="relative py-1.5 text-[0.93rem] text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-sm after:bg-ink after:transition-transform after:duration-200 hover:after:scale-x-100 first:after:scale-x-100"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="سبد خرید"
            aria-haspopup="true"
            className="relative flex h-[46px] w-[46px] items-center justify-center rounded-full bg-transparent transition-colors duration-200 hover:bg-ink/6"
          >
            <CartIcon className="h-[30px] w-[30px] text-ink" />
            <span className="absolute left-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-0.5 text-[0.62rem] leading-none text-white">
              ۰
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
        className={`lg:hidden flex-col gap-1 border-t border-line bg-header-bg px-(--gutter) py-2 ${
          menuOpen ? "flex" : "hidden"
        }`}
      >
        {NAV_LINKS.map((link, i) => (
          <a
            key={`mobile-${link.href}-${i}`}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            className="rounded-md px-2 py-2.5 text-[0.95rem] text-ink hover:bg-ink/5"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
