"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import type { NavCategory } from "@/domains/categories/tree";
import type { NavBrand } from "@/domains/brands/queries";
import { navLinkClass } from "@/components/layout/nav-styles";
import { useDimPage } from "@/components/overlays/UIOverlayProvider";

/**
 * Desktop header navigation (second row of the centre column): two items.
 *
 * - **دسته‌بندی‌ها** — hover/focus opens a full-width panel. Its start side is
 *   a rail with the three audiences (مردانه / زنانه / بچگانه); hovering one
 *   shows that audience's groups and types beside it, using the same
 *   five-column layout the old per-audience menus had. The first audience is
 *   shown when the panel opens, so it is never empty.
 * - **برندها** — hover/focus opens a wide panel of the best-selling brands
 *   (logo + name). The trigger itself links to `/brands`.
 *
 * Behaviour (WCAG 1.4.13 "content on hover or focus"):
 * - opens on hover **and** keyboard focus; the panel is a DOM child of the
 *   same wrapper as its trigger, so the pointer can travel into it without a
 *   `mouseleave`;
 * - Escape closes it and returns focus to the trigger;
 * - clicking any link closes it (the header persists across navigations);
 * - one panel at a time, and the page behind is dimmed while one is open.
 *
 * **Layout requirement:** panels are `absolute inset-x-0 top-full`, so the
 * `<header>` containing this component must be positioned (see `Header.tsx`).
 *
 * The categories trigger is a button (there is no "all categories" page);
 * everything inside the panels is a real link. Brand tiles are only mounted
 * after the brands panel was first opened, so the logos are not fetched on
 * every page load.
 */

type MenuId = "categories" | "brands";

/** Panel shell shared by both menus: same surface, border, slide-and-fade as the old category menus. */
function panelClass(isOpen: boolean): string {
  return `absolute inset-x-0 top-full z-[46] border-b border-line bg-header-bg transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none ${
    isOpen ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-2 opacity-0"
  }`;
}

const DIVIDER = <span aria-hidden="true" className="h-5 w-px self-center bg-[#c9ced2]" />;

/** Hover/focus/Escape wiring shared by both menu wrappers. */
function MenuWrapper({
  isOpen,
  onOpen,
  onClose,
  triggerRef,
  children,
}: {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <div
      className="flex items-center"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onFocus={onOpen}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          onClose();
          triggerRef.current?.focus();
        }
      }}
    >
      {children}
    </div>
  );
}

export function HeaderNav({ categories, brands }: { categories: NavCategory[]; brands: NavBrand[] }) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [activeAudience, setActiveAudience] = useState<string | null>(null);
  const [brandsMounted, setBrandsMounted] = useState(false);
  const categoriesTriggerRef = useRef<HTMLButtonElement>(null);
  const brandsTriggerRef = useRef<HTMLAnchorElement>(null);

  useDimPage(openMenu !== null);

  const close = () => setOpenMenu(null);
  const open = (menu: MenuId) => {
    setOpenMenu(menu);
    if (menu === "brands") setBrandsMounted(true);
  };

  const categoriesOpen = openMenu === "categories";
  const brandsOpen = openMenu === "brands";
  // Falls back to the first audience if the remembered one no longer exists.
  const audience = categories.find((root) => root.slug === activeAudience) ?? categories[0] ?? null;

  return (
    <>
      {categories.length > 0 && audience && (
        <MenuWrapper isOpen={categoriesOpen} onOpen={() => open("categories")} onClose={close} triggerRef={categoriesTriggerRef}>
          <button
            type="button"
            ref={categoriesTriggerRef}
            aria-expanded={categoriesOpen}
            aria-controls="category-menu"
            className={`${navLinkClass(categoriesOpen)} cursor-pointer`}
          >
            دسته‌بندی‌ها
          </button>

          <div id="category-menu" aria-hidden={!categoriesOpen} className={panelClass(categoriesOpen)}>
            <Container className="grid max-h-[calc(100vh-150px)] grid-cols-[190px_1fr] gap-x-6 overflow-y-auto py-6">
              {/* Audience rail. A thin rule on its end edge separates it from the content, like the column rules inside. */}
              <ul aria-label="دسته‌های اصلی" className="flex flex-col gap-1 border-e border-[#c9ced2] pe-4">
                {categories.map((root) => {
                  const isActive = root.slug === audience.slug;
                  return (
                    <li key={root.slug}>
                      <Link
                        href={`/category/${root.slug}`}
                        onClick={close}
                        onMouseEnter={() => setActiveAudience(root.slug)}
                        onFocus={() => setActiveAudience(root.slug)}
                        aria-current={isActive ? "true" : undefined}
                        className={`block rounded-[8px] px-3 py-2.5 text-[1rem] font-semibold transition-colors duration-150 ${
                          isActive ? "bg-ink/6 text-brand" : "text-ink hover:bg-ink/5"
                        }`}
                      >
                        {root.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Content of the hovered audience. `min-h` stops the panel
                  jumping in height as the pointer moves between audiences. */}
              <div className="min-h-[22rem] min-w-0">
                <Link
                  href={`/category/${audience.slug}`}
                  onClick={close}
                  className="mb-5 inline-block text-[0.88rem] font-semibold text-ink underline underline-offset-4"
                >
                  همه‌ی محصولات {audience.name}
                </Link>

                {/* Columns are separated by thin gray rules (same gray as the
                    header's dividers): a start border on every group but the
                    first, with padding either side of it. */}
                <div className="grid grid-cols-5 gap-y-6">
                  {audience.children.map((group, groupIndex) => (
                    // The first group (clothing) is by far the longest, so it
                    // gets two grid columns and a two-column list.
                    <div
                      key={group.slug}
                      className={[
                        groupIndex === 0 ? "col-span-2 ps-0" : "border-s border-[#c9ced2] ps-5",
                        groupIndex === audience.children.length - 1 ? "pe-0" : "pe-5",
                      ].join(" ")}
                    >
                      <Link
                        href={`/category/${group.slug}`}
                        onClick={close}
                        className="mb-2.5 block text-[0.95rem] font-bold text-brand hover:underline"
                      >
                        {group.name}
                      </Link>
                      <ul className={groupIndex === 0 ? "columns-2 gap-x-6 [column-rule:1px_solid_#c9ced2]" : undefined}>
                        {group.children.map((type) => (
                          <li key={type.slug} className="break-inside-avoid">
                            <Link
                              href={`/category/${type.slug}`}
                              onClick={close}
                              className="block py-1 text-[0.85rem] text-text-secondary hover:text-ink"
                            >
                              {type.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </Container>
          </div>
        </MenuWrapper>
      )}

      {categories.length > 0 && DIVIDER}

      <MenuWrapper isOpen={brandsOpen} onOpen={() => open("brands")} onClose={close} triggerRef={brandsTriggerRef}>
        <Link
          href="/brands"
          ref={brandsTriggerRef}
          onClick={close}
          className={navLinkClass(brandsOpen)}
        >
          برندها
        </Link>

        <div id="brand-menu" aria-hidden={!brandsOpen} className={panelClass(brandsOpen)}>
          <Container className="max-h-[calc(100vh-150px)] overflow-y-auto py-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="m-0 text-[0.95rem] font-bold text-brand">برندهای پرفروش و ترند</h2>
              <Link
                href="/brands"
                onClick={close}
                className="text-[0.88rem] font-semibold text-ink underline underline-offset-4"
              >
                همه‌ی برندها
              </Link>
            </div>

            {brandsMounted &&
              (brands.length > 0 ? (
                <ul className="grid grid-cols-6 gap-3">
                  {brands.map((brand) => (
                    <li key={brand.slug}>
                      <Link
                        // Brand names are matched by the storefront search
                        // (Persian and Latin spelling), so this lists the
                        // brand's products.
                        href={`/search?q=${encodeURIComponent(brand.name)}`}
                        onClick={close}
                        className="group flex h-full flex-col items-center gap-2.5 rounded-[14px] px-2 py-3 text-center transition-colors duration-150 hover:bg-ink/5"
                      >
                        <span className="relative flex h-[72px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-card-image">
                          {brand.logoUrl ? (
                            <Image
                              src={brand.logoUrl}
                              alt=""
                              fill
                              sizes="160px"
                              className="object-contain p-3"
                            />
                          ) : (
                            // No logo uploaded yet: the brand's initial, so the tile keeps its shape.
                            <span aria-hidden="true" className="text-[1.6rem] font-bold text-ink/45">
                              {(brand.nameEn ?? brand.name).trim().charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="text-[0.88rem] font-semibold text-ink">{brand.name}</span>
                        {brand.nameEn && (
                          <span dir="ltr" className="-mt-1.5 text-[0.75rem] text-text-secondary">
                            {brand.nameEn}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 py-6 text-[0.9rem] text-text-secondary">هنوز برندی ثبت نشده است.</p>
              ))}
          </Container>
        </div>
      </MenuWrapper>
    </>
  );
}
