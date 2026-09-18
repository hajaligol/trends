"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/ui/icons";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

/**
 * Floating wishlist-toggle button shown over a product image. Mirrors
 * .wishlist-btn in reference/prototype.html: the heart fills and turns
 * red when active.
 *
 * Two behaviors depending on auth state (TRENDS_PROJECT_CONTEXT.md §6
 * "Wishlist" — "authenticated persistence" + "sensible guest behavior"):
 * - Signed in: reads/writes `WishlistProvider`'s real, persisted state
 *   (`toggleWishlistAction` under the hood).
 * - Guest: a local-only `useState` toggle, same as Phase 2's original
 *   demo behavior — nothing is written anywhere. This is a deliberate
 *   choice, not a leftover: pretending to save a guest's wishlist would
 *   be a fake write that silently vanishes on refresh, which is worse
 *   than being honestly non-persistent (rule G, "no fake actions").
 */
export function WishlistButton({ productId, productName }: { productId: string; productName: string }) {
  const { isAuthenticated, isWishlisted, toggle } = useWishlist();
  const [guestActive, setGuestActive] = useState(false);

  const active = isAuthenticated ? isWishlisted(productId) : guestActive;

  function handleClick() {
    if (isAuthenticated) {
      void toggle(productId, !active);
    } else {
      setGuestActive((value) => !value);
    }
  }

  return (
    <button
      type="button"
      aria-label={
        active
          ? `حذف «${productName}» از علاقه‌مندی‌ها`
          : `افزودن «${productName}» به علاقه‌مندی‌ها`
      }
      aria-pressed={active}
      onClick={handleClick}
      className="absolute top-2.5 left-2.5 flex h-[38px] w-[38px] items-center justify-center rounded-full border-0 bg-bg/70"
    >
      <HeartIcon
        style={active ? { fill: "currentColor" } : undefined}
        className={`h-[22px] w-[22px] transition-colors duration-200 ${
          active ? "text-[#E0483C]" : "text-ink/45"
        }`}
      />
    </button>
  );
}
