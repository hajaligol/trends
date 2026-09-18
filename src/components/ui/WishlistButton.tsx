"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/ui/icons";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

/**
 * Shared wishlist-toggle state, used by both the floating icon button
 * (on product cards) and the labeled button (on the product detail
 * page), so the auth/guest logic below only lives in one place.
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
function useWishlistToggle(productId: string) {
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

  return { active, handleClick };
}

/**
 * Floating wishlist-toggle button shown over a product image. Mirrors
 * .wishlist-btn in reference/prototype.html: the heart fills and turns
 * red when active.
 */
export function WishlistButton({ productId, productName }: { productId: string; productName: string }) {
  const { active, handleClick } = useWishlistToggle(productId);

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
      className={`absolute top-2.5 left-2.5 flex h-[38px] w-[38px] items-center justify-center rounded-full border-0 bg-bg/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${
        active ? "opacity-100" : ""
      }`}
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

/**
 * Labeled wishlist toggle for the product detail page — a full-width
 * secondary action next to "افزودن به سبد خرید", rather than the bare
 * icon used on cards, so the action is discoverable without hovering.
 */
export function WishlistToggleButton({ productId, productName }: { productId: string; productName: string }) {
  const { active, handleClick } = useWishlistToggle(productId);

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={handleClick}
      className={`inline-flex w-full items-center justify-center gap-2.5 rounded-full border px-[26px] py-[13px] text-[0.92rem] transition-colors duration-200 ${
        active ? "border-[#E0483C] text-[#E0483C]" : "border-line text-ink hover:border-ink"
      }`}
    >
      <HeartIcon
        style={active ? { fill: "currentColor" } : undefined}
        className="h-[18px] w-[18px] transition-colors duration-200"
      />
      {active ? `حذف از علاقه‌مندی‌ها` : `افزودن به علاقه‌مندی‌ها`}
    </button>
  );
}
