"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/ui/icons";
import { useToast } from "@/components/feedback/ToastProvider";
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
  const { showToast } = useToast();

  const active = isAuthenticated ? isWishlisted(productId) : guestActive;

  const ADDED_MESSAGE = "محصول به علاقه‌مندی‌ها اضافه شد";

  function handleClick() {
    const willBeActive = !active;
    if (isAuthenticated) {
      // Announce only once the server has actually saved it.
      void toggle(productId, willBeActive).then((ok) => {
        if (ok && willBeActive) showToast(ADDED_MESSAGE);
      });
    } else {
      setGuestActive(willBeActive);
      if (willBeActive) showToast(ADDED_MESSAGE);
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
 * Wishlist toggle for the product detail page — a round outlined icon
 * button that sits beside "افزودن به سبد خرید". Icon-only (with a real
 * accessible name and `aria-pressed`) so it fits next to the primary CTA
 * on narrow screens without competing with it.
 */
export function WishlistToggleButton({ productId, productName }: { productId: string; productName: string }) {
  const { active, handleClick } = useWishlistToggle(productId);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={
        active
          ? `حذف «${productName}» از علاقه‌مندی‌ها`
          : `افزودن «${productName}» به علاقه‌مندی‌ها`
      }
      title={active ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      onClick={handleClick}
      className={`flex h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full border bg-white transition-colors duration-200 ${
        active ? "border-[#E0483C] text-[#E0483C]" : "border-line text-ink hover:border-ink"
      }`}
    >
      <HeartIcon
        style={active ? { fill: "#E0483C", stroke: "#E0483C" } : undefined}
        className="h-[22px] w-[22px] transition-colors duration-200"
      />
    </button>
  );
}
