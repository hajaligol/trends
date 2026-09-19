"use client";

import { Fragment, useRef, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import type { NavCategory } from "@/domains/categories/tree";
import { navLinkClass } from "@/components/layout/nav-styles";

/**
 * Desktop category navigation: one trigger per audience (مردانه/زنانه/
 * بچگانه) in the header's second row, each opening a full-width panel with that
 * audience's four groups and every type under them.
 *
 * Behaviour (WCAG 1.4.13 "content on hover or focus"):
 * - opens on hover **and** on keyboard focus, so it is usable without a
 *   mouse (Tab moves from the trigger straight into the panel's links);
 * - stays open while the pointer moves from the trigger into the panel
 *   (the panel is a DOM child of the same wrapper, so no mouseleave fires
 *   between them);
 * - Escape closes it and returns focus to the trigger;
 * - clicking any link closes it (the header persists across navigations,
 *   so state would otherwise stay "open" on the next page).
 *
 * **Layout requirement:** the panel is `absolute inset-x-0 top-full`, so
 * the `<header>` that contains this component must be a positioned
 * element (`relative` or `sticky`) — see the comment in `Header.tsx`.
 *
 * The trigger itself is a real link to the audience's page, so it still
 * works on touch devices and with JS disabled. The panel is only rendered
 * while open — the full tree (≈200 links) is not in the initial HTML;
 * crawlable paths to every category come from the footer and the
 * sub-category navigation on each category page instead.
 */
export function CategoryMegaMenu({ categories }: { categories: NavCategory[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const triggerRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  const close = () => setOpenSlug(null);

  return (
    <>
      {categories.map((root, index) => {
        const isOpen = openSlug === root.slug;
        const panelId = `category-menu-${root.slug}`;
        return (
          <Fragment key={root.slug}>
          {/* Gray divider between the audience triggers (not before the first). */}
          {index > 0 && (
            <span aria-hidden="true" className="h-5 w-px self-center bg-[#c9ced2]" />
          )}
          <div
            className="flex items-center"
            onMouseEnter={() => setOpenSlug(root.slug)}
            onMouseLeave={close}
            onFocus={() => setOpenSlug(root.slug)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) close();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && isOpen) {
                close();
                triggerRefs.current.get(root.slug)?.focus();
              }
            }}
          >
            <Link
              href={`/category/${root.slug}`}
              ref={(node) => {
                if (node) triggerRefs.current.set(root.slug, node);
                else triggerRefs.current.delete(root.slug);
              }}
              aria-expanded={isOpen}
              aria-controls={isOpen ? panelId : undefined}
              onClick={close}
              className={navLinkClass(isOpen)}
            >
              {root.name}
            </Link>

            {isOpen && (
              <div
                id={panelId}
                className="absolute inset-x-0 top-full z-30 border-b border-line bg-header-bg"
              >
                <Container className="max-h-[calc(100vh-150px)] overflow-y-auto py-6">
                  <Link
                    href={`/category/${root.slug}`}
                    onClick={close}
                    className="mb-5 inline-block text-[0.88rem] font-semibold text-ink underline underline-offset-4"
                  >
                    همه‌ی محصولات {root.name}
                  </Link>

                  {/* Columns are separated by thin gray rules (same gray as the
                      header's audience dividers): a left border on every
                      group but the first, with padding either side of it. */}
                  <div className="grid grid-cols-5 gap-y-6">
                    {root.children.map((group, groupIndex) => (
                      // The first group (clothing) is by far the longest, so
                      // it gets two grid columns and a two-column list.
                      <div
                        key={group.slug}
                        className={[
                          groupIndex === 0 ? "col-span-2 ps-0" : "border-s border-[#c9ced2] ps-5",
                          groupIndex === root.children.length - 1 ? "pe-0" : "pe-5",
                        ].join(" ")}
                      >
                        <Link
                          href={`/category/${group.slug}`}
                          onClick={close}
                          className="mb-2.5 block text-[0.95rem] font-bold text-ink hover:underline"
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
                </Container>
              </div>
            )}
          </div>
          </Fragment>
        );
      })}
    </>
  );
}
