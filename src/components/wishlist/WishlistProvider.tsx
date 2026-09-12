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
import { useSession } from "next-auth/react";
import { getWishlistedProductIdsAction, toggleWishlistAction } from "@/domains/wishlist/actions";

type WishlistContextValue = {
  isAuthenticated: boolean;
  /** `true` until the initial fetch resolves (only meaningful when
   * `isAuthenticated`; guests never fetch anything). */
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  /** For signed-in users, persists via `toggleWishlistAction` and
   * updates local state from the real result. For guests, this context
   * itself does nothing — `WishlistButton` handles the local-only,
   * non-persisted toggle itself in that case (see its own comment on why
   * that's "sensible guest behavior", not a shortcut). */
  toggle: (productId: string, shouldBeActive: boolean) => Promise<boolean>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * Fetches the signed-in user's full set of wishlisted product ids once
 * per page load (`getWishlistedProductIdsAction`, see that function's
 * comment) rather than every `WishlistButton` fetching its own single
 * product's status — one request per page instead of one per card,
 * mirroring `CartProvider`'s "fetch once, read from context" shape, and
 * for the same static-rendering reason (`useSession()`/this fetch happen
 * client-side so listing pages like `/`, `/category/[slug]` don't need
 * `auth()` in their Server Component render).
 *
 * `isAuthenticated`/`isLoading` are *derived* from `status` and a
 * "has the authenticated fetch finished" flag rather than reset directly
 * inside the effect for the signed-out case — every `setState` call here
 * happens inside a `.then()`/`.finally()` callback, never synchronously
 * in the effect body, so a status flip never needs its own imperative
 * reset.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isAuthenticated = Boolean(session?.user);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (status === "loading" || !isAuthenticated) return undefined;
    let cancelled = false;
    getWishlistedProductIdsAction()
      .then((ids) => {
        if (!cancelled) setWishlistedIds(new Set(ids));
      })
      .finally(() => {
        if (!cancelled) setHasFetched(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, status]);

  const isLoading = status === "loading" || (isAuthenticated && !hasFetched);

  const isWishlisted = useCallback(
    (productId: string) => isAuthenticated && wishlistedIds.has(productId),
    [isAuthenticated, wishlistedIds],
  );

  const toggle = useCallback(async (productId: string, shouldBeActive: boolean) => {
    // Optimistic update, reverted on failure — same pattern as
    // `CartProvider`'s mutations, just kept local here since a wishlist
    // toggle has no other derived totals to recompute.
    setWishlistedIds((current) => {
      const next = new Set(current);
      if (shouldBeActive) next.add(productId);
      else next.delete(productId);
      return next;
    });

    const result = await toggleWishlistAction(productId, shouldBeActive);
    if (!result.ok) {
      setWishlistedIds((current) => {
        const next = new Set(current);
        if (shouldBeActive) next.delete(productId);
        else next.add(productId);
        return next;
      });
      return false;
    }
    return true;
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, isWishlisted, toggle }),
    [isAuthenticated, isLoading, isWishlisted, toggle],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within a WishlistProvider");
  return context;
}
