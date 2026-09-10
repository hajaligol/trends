"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/ui/icons";

/**
 * Floating wishlist-toggle button shown over a product image. Mirrors
 * .wishlist-btn in reference/prototype.html: the heart fills and turns
 * red when active.
 *
 * State is local-only in this phase (no persistence) — Phase 7 replaces
 * this with real wishlist domain state (guest + authenticated
 * persistence, duplicate prevention).
 */
export function WishlistButton({ productName }: { productName: string }) {
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      aria-label={
        active
          ? `حذف «${productName}» از علاقه‌مندی‌ها`
          : `افزودن «${productName}» به علاقه‌مندی‌ها`
      }
      aria-pressed={active}
      onClick={() => setActive((value) => !value)}
      className="absolute top-2.5 left-2.5 flex h-[38px] w-[38px] items-center justify-center rounded-full border-0 bg-bg/90"
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
