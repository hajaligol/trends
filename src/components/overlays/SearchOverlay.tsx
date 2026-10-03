"use client";

import { useRef } from "react";
import { useUIOverlay } from "@/components/overlays/UIOverlayProvider";
import { useDialogA11y } from "@/lib/hooks/useDialogA11y";

/**
 * Mirrors #searchOverlay in the prototype: focuses the input on open,
 * closes on Escape or backdrop click. Submits as a plain GET form to
 * `/search?q=...` (Phase 5) — no client-side fetch/state needed, the
 * `/search` page itself is what's database-backed and URL-driven.
 *
 * Uses the same `useDialogA11y` focus-trap hook as the former cart drawer (Phase
 * 14 accessibility pass) — previously had Escape-to-close and initial
 * input focus but no Tab trap and no focus restored to the search
 * trigger button on close.
 */
export function SearchOverlay() {
  const { isSearchOpen, closeSearch } = useUIOverlay();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useDialogA11y(isSearchOpen, closeSearch, containerRef, inputRef);

  if (!isSearchOpen) return null;

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) closeSearch();
      }}
      className="fixed inset-0 z-[100] flex justify-center bg-ink/35 pt-[min(12vh,120px)]"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="searchTitle"
        className="w-[min(560px,90vw)] rounded-[22px] bg-bg p-[26px]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="searchTitle" className="m-0 text-base">
            جستجو در ترندز
          </h3>
          <button
            type="button"
            aria-label="بستن جستجو"
            onClick={closeSearch}
            className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-ink/[0.06] text-base text-ink"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
        <form action="/search" method="get" onSubmit={closeSearch}>
          <input
            ref={inputRef}
            type="text"
            name="q"
            required
            placeholder="نام محصول را جستجو کنید..."
            className="w-full rounded-full border border-line bg-white px-[18px] py-3.5 text-[0.95rem] focus:outline-2 focus:outline-ink focus:outline-offset-2"
          />
        </form>
        <p className="mt-3.5 text-[0.8rem] text-text-secondary">
          مثال: هودی، کتانی، پالتو، اکسسوری
        </p>
      </div>
    </div>
  );
}
