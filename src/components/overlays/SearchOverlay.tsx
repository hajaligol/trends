"use client";

import { useRef } from "react";
import { useUIOverlay } from "@/components/overlays/UIOverlayProvider";
import { MobileSearch } from "@/components/search/MobileSearch";
import { useDialogA11y } from "@/lib/hooks/useDialogA11y";

/**
 * Full-screen search panel, opened by the search button of the mobile
 * header (the desktop header has its own inline search, `HeaderSearch`, so
 * this overlay is only reachable below `lg`). It fills the screen so the
 * on-screen keyboard has room, shows live product / brand / category
 * results and the trending and recent searches inside it, and scrolls its
 * own content. Submitting goes to `/search?q=...` (database-backed, URL
 * driven).
 *
 * Dialog behaviour (focus trap, Escape, focus restore) comes from
 * `useDialogA11y`; the input is focused by `MobileSearch` on open.
 */
export function SearchOverlay() {
  const { isSearchOpen, closeSearch } = useUIOverlay();
  const containerRef = useRef<HTMLDivElement>(null);

  useDialogA11y(isSearchOpen, closeSearch, containerRef);

  if (!isSearchOpen) return null;

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) closeSearch();
      }}
      className="fixed inset-0 z-[100] bg-ink/35"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="searchTitle"
        className="modal-panel-in mx-auto flex h-dvh w-full max-w-[640px] flex-col bg-bg pt-[env(safe-area-inset-top,0px)] sm:h-auto sm:max-h-[90dvh] sm:mt-[5dvh] sm:rounded-[22px]"
      >
        <div className="flex items-center justify-between px-[var(--gutter)] pt-4 pb-3">
          <h2 id="searchTitle" className="m-0 text-base font-bold">
            جستجو در ترندز
          </h2>
          <button
            type="button"
            aria-label="بستن جستجو"
            onClick={closeSearch}
            className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-ink/[0.06] text-ink"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
        <MobileSearch
          inputId="overlay-search"
          autoFocus
          onNavigate={closeSearch}
          className="flex-1 overflow-y-auto overscroll-contain px-[var(--gutter)] pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
        />
      </div>
    </div>
  );
}
