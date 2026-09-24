"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type TabId = "specs" | "reviews";
const TAB_ORDER: TabId[] = ["specs", "reviews"];

function tabFromHash(hash: string): TabId | null {
  const id = hash.replace(/^#/, "");
  return id === "specs" || id === "reviews" ? id : null;
}

/**
 * Two-tab section under the product hero: مشخصات / دیدگاه‌ها.
 *
 * Both panels are rendered on the server and passed in as props, so this
 * client component only owns "which tab is visible" — no data or business
 * logic lives here. The inactive panel stays in the DOM (`hidden`) so its
 * content (notably approved reviews) is still present in the server HTML.
 *
 * A `#reviews` / `#specs` URL hash selects the matching tab, which lets the
 * rating link next to the product title jump straight to the reviews.
 *
 * Keyboard: WAI-ARIA tabs pattern (roving tabindex, Arrow/Home/End). Arrow
 * direction follows the computed text direction, so in RTL the left arrow
 * moves to the next tab, matching how the tabs are laid out visually.
 */
export function ProductTabs({
  specs,
  reviews,
  reviewCount,
}: {
  specs: ReactNode;
  reviews: ReactNode;
  reviewCount: number;
}) {
  const baseId = useId();
  const [active, setActive] = useState<TabId>("specs");
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ specs: null, reviews: null });

  useEffect(() => {
    function syncFromHash() {
      const fromHash = tabFromHash(window.location.hash);
      if (fromHash) setActive(fromHash);
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function focusTab(id: TabId) {
    setActive(id);
    tabRefs.current[id]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TAB_ORDER.indexOf(active);
    const isRtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forwardKey = isRtl ? "ArrowLeft" : "ArrowRight";
    const backwardKey = isRtl ? "ArrowRight" : "ArrowLeft";

    let next: TabId | undefined;
    if (event.key === forwardKey) next = TAB_ORDER[(index + 1) % TAB_ORDER.length];
    else if (event.key === backwardKey) next = TAB_ORDER[(index - 1 + TAB_ORDER.length) % TAB_ORDER.length];
    else if (event.key === "Home") next = TAB_ORDER[0];
    else if (event.key === "End") next = TAB_ORDER[TAB_ORDER.length - 1];

    if (next) {
      event.preventDefault();
      focusTab(next);
    }
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "specs", label: "مشخصات محصول" },
    { id: "reviews", label: reviewCount > 0 ? `دیدگاه‌ها (${toPersianDigits(reviewCount)})` : "دیدگاه‌ها" },
  ];

  return (
    // `id="reviews"` on the wrapper gives the rating link a scroll target;
    // the tab itself is switched by the hashchange listener above.
    <section id="reviews" className="scroll-mt-28">
      <div
        role="tablist"
        aria-label="اطلاعات بیشتر درباره محصول"
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-header-bg p-1"
      >
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={handleKeyDown}
              className={`min-h-11 cursor-pointer whitespace-nowrap rounded-full px-5 text-[0.92rem] font-semibold transition-colors duration-200 sm:px-7 ${
                selected ? "bg-ink text-white" : "text-text-secondary hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${baseId}-panel-${tab.id}`}
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            hidden={active !== tab.id}
            tabIndex={0}
          >
            {tab.id === "specs" ? specs : reviews}
          </div>
        ))}
      </div>
    </section>
  );
}
