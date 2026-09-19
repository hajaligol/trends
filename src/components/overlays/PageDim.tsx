"use client";

import { useUIOverlay } from "@/components/overlays/UIOverlayProvider";

/**
 * Full-screen scrim that dims the page behind the header's open panels
 * (search dropdown, category mega menus).
 *
 * Stacking: the header is `z-40` and creates its own stacking context, so
 * this scrim at `z-30` sits above all page content but below the whole
 * header — the header and its open panel stay undimmed. The cart drawer
 * and search overlay (z-90+) still sit above it.
 *
 * `pointer-events-none`: it is purely visual, so hover/click behaviour of
 * the menus and the page underneath is unchanged. Always mounted so it can
 * fade both ways; `invisible` takes it out of hit-testing/paint when off.
 */
export function PageDim() {
  const { isPageDimmed } = useUIOverlay();
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-30 bg-ink/35 transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${
        isPageDimmed ? "visible opacity-100" : "invisible opacity-0"
      }`}
    />
  );
}
