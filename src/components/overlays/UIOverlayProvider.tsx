"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UIOverlayState = {
  isSearchOpen: boolean;
  isCartOpen: boolean;
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

  const value = useMemo(
    () => ({ isSearchOpen, isCartOpen, openSearch, closeSearch, openCart, closeCart }),
    [isSearchOpen, isCartOpen, openSearch, closeSearch, openCart, closeCart],
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
