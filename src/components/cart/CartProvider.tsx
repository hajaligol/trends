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
import {
  addToCartAction,
  clearCartAction,
  getCurrentCartAction,
  removeCartItemAction,
  updateCartItemQuantityAction,
} from "@/domains/cart/actions";
import type { CartSummary } from "@/domains/cart/queries";

const EMPTY_CART: CartSummary = { cartId: null, items: [], itemCount: 0, subtotalToman: 0 };

type CartContextValue = {
  cart: CartSummary;
  /** `true` until the initial client-side fetch resolves — used to avoid
   * flashing "cart is empty" before the real cart has loaded. */
  isLoading: boolean;
  /** `true` while any mutation is in flight — used to disable
   * add/quantity/remove controls so a double-click can't fire two
   * overlapping requests. */
  isMutating: boolean;
  error: string | null;
  addItem: (variantId: string, quantity: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Owns the current cart's client-visible state. Fetches once on mount
 * via `getCurrentCartAction()` (a Server Action used as a plain read —
 * see that function's comment) rather than the root layout calling
 * `auth()`/`cookies()` server-side, for the exact static-rendering
 * reason `AuthSessionProvider` documents for `useSession()`: a cart can
 * belong to a guest (cookie) or a signed-in user, either way resolving
 * it requires reading a cookie, and doing that in `RootLayout` would
 * opt every page out of static generation.
 *
 * Every mutation (`addItem`/`updateQuantity`/`removeItem`/`clear`) calls
 * its Server Action directly and replaces local state with the
 * authoritative `CartSummary` the action returns — no optimistic
 * guessing at price/stock/totals client-side, since those are exactly
 * the values TRENDS_PROJECT_CONTEXT.md §4.3 says the server must own.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartSummary>(EMPTY_CART);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentCartAction()
      .then((summary) => {
        if (!cancelled) setCart(summary);
      })
      .catch(() => {
        // A failed initial fetch just leaves the cart looking empty —
        // not worth surfacing as a user-facing error for a background
        // load with no action attached to retry.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addItem = useCallback(async (variantId: string, quantity: number) => {
    setIsMutating(true);
    setError(null);
    try {
      const result = await addToCartAction(variantId, quantity);
      if (result.ok) {
        setCart(result.cart);
        return true;
      }
      setError(result.error);
      return false;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    setIsMutating(true);
    setError(null);
    try {
      const result = await updateCartItemQuantityAction(itemId, quantity);
      if (result.ok) {
        setCart(result.cart);
        return true;
      }
      setError(result.error);
      return false;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    setIsMutating(true);
    setError(null);
    try {
      const result = await removeCartItemAction(itemId);
      if (result.ok) {
        setCart(result.cart);
        return true;
      }
      setError(result.error);
      return false;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const clear = useCallback(async () => {
    setIsMutating(true);
    setError(null);
    try {
      const result = await clearCartAction();
      if (result.ok) {
        setCart(result.cart);
        return true;
      }
      setError(result.error);
      return false;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const value = useMemo(
    () => ({ cart, isLoading, isMutating, error, addItem, updateQuantity, removeItem, clear }),
    [cart, isLoading, isMutating, error, addItem, updateQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
