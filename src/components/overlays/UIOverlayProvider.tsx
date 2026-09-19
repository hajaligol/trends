"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UIOverlayState = {
  isSearchOpen: boolean;
  isCartOpen: boolean;
  /** True while at least one header panel (search dropdown, category menu) asks for the page to be dimmed. */
  isPageDimmed: boolean;
  /** True while a panel asks for the header itself to be dimmed as well (the search dropdown). */
  isHeaderDimmed: boolean;
  /** Registers a dim request; returns the function that releases it. Prefer `useDimPage`. */
  acquireDim: (includeHeader?: boolean) => () => void;
  openSearch: () => void;
  closeSearch: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const UIOverlayContext = createContext<UIOverlayState | null>(null);

/**
 * Shares search-overlay/cart-drawer open state between the header's
 * trigger buttons (rendered in the layout) and the overlay/drawer
 * components (also rendered at the layout root). Mirrors the
 * prototype's global open/close functions in <script>, reimplemented as
 * React state instead of directly mutating the DOM.
 */
export function UIOverlayProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  // A counter rather than a boolean, so two panels asking at once (or one
  // closing as another opens) can't switch each other's dimming off.
  const [dimCount, setDimCount] = useState(0);
  const [headerDimCount, setHeaderDimCount] = useState(0);

  const openSearch = useCallback(() => {
    setCartOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openCart = useCallback(() => {
    setSearchOpen(false);
    setCartOpen(true);
  }, []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const acquireDim = useCallback((includeHeader = false) => {
    setDimCount((count) => count + 1);
    if (includeHeader) setHeaderDimCount((count) => count + 1);
    return () => {
      setDimCount((count) => Math.max(0, count - 1));
      if (includeHeader) setHeaderDimCount((count) => Math.max(0, count - 1));
    };
  }, []);

  const value = useMemo(
    () => ({
      isSearchOpen,
      isCartOpen,
      isPageDimmed: dimCount > 0,
      isHeaderDimmed: headerDimCount > 0,
      acquireDim,
      openSearch,
      closeSearch,
      openCart,
      closeCart,
    }),
    [isSearchOpen, isCartOpen, dimCount, headerDimCount, acquireDim, openSearch, closeSearch, openCart, closeCart],
  );

  return <UIOverlayContext.Provider value={value}>{children}</UIOverlayContext.Provider>;
}

export function useUIOverlay(): UIOverlayState {
  const context = useContext(UIOverlayContext);
  if (!context) {
    throw new Error("useUIOverlay must be used within a UIOverlayProvider");
  }
  return context;
}

/**
 * Dims the rest of the page (see `PageDim`) while `active` is true.
 * Used by header panels that open over the page content: the desktop
 * search dropdown and the category mega menus.
 *
 * With `{ includeHeader: true }` the header bar is dimmed too (the search
 * dropdown does this; the mega menus keep the header bright). The panel
 * that asked must sit above the header dim layer — see `Header.tsx`.
 */
export function useDimPage(active: boolean, options?: { includeHeader?: boolean }) {
  const { acquireDim } = useUIOverlay();
  const includeHeader = options?.includeHeader ?? false;
  useEffect(() => {
    if (!active) return;
    return acquireDim(includeHeader);
  }, [active, includeHeader, acquireDim]);
}
