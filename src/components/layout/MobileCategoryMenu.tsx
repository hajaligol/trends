"use client";

import Link from "next/link";
import type { NavCategory } from "@/domains/categories/tree";

function Chevron({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const SUMMARY_CLASS =
  "flex cursor-pointer list-none items-center justify-between rounded-md px-2 text-ink hover:bg-ink/5 [&::-webkit-details-marker]:hidden";

/**
 * Mobile/tablet category navigation: nested native `<details>` disclosures
 * (audience > group > types). No JS state to manage — the browser handles
 * open/close, keyboard (Enter/Space on the summary) and screen-reader
 * expanded state for free. Every level also offers an explicit "all …"
 * link, since the summary row itself only toggles.
 */
export function MobileCategoryMenu({
  categories,
  onNavigate,
}: {
  categories: NavCategory[];
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col">
      {categories.map((root) => (
        <details key={root.slug} className="group border-b border-line/60">
          <summary className={`${SUMMARY_CLASS} py-2.5 text-[0.95rem] font-semibold`}>
            {root.name}
            <Chevron className="transition-transform group-open:rotate-180" />
          </summary>

          <div className="flex flex-col pb-2 ps-3">
            <Link
              href={`/category/${root.slug}`}
              onClick={onNavigate}
              className="rounded-md px-2 py-2 text-[0.88rem] text-ink underline underline-offset-4"
            >
              همه‌ی محصولات {root.name}
            </Link>

            {root.children.map((group) => (
              <details key={group.slug} className="group/sub">
                <summary className={`${SUMMARY_CLASS} py-2 text-[0.9rem]`}>
                  {group.name}
                  <Chevron className="transition-transform group-open/sub:rotate-180" />
                </summary>
                <ul className="flex flex-col pb-1 ps-3">
                  <li>
                    <Link
                      href={`/category/${group.slug}`}
                      onClick={onNavigate}
                      className="block rounded-md px-2 py-1.5 text-[0.85rem] text-ink underline underline-offset-4"
                    >
                      همه‌ی {group.name}
                    </Link>
                  </li>
                  {group.children.map((type) => (
                    <li key={type.slug}>
                      <Link
                        href={`/category/${type.slug}`}
                        onClick={onNavigate}
                        className="block rounded-md px-2 py-1.5 text-[0.85rem] text-text-secondary hover:bg-ink/5 hover:text-ink"
                      >
                        {type.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
