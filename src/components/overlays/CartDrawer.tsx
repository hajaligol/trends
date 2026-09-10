"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useUIOverlay } from "@/components/overlays/UIOverlayProvider";
import { demoCartItems, demoCartTotal } from "@/domains/cart/demo-data";

/**
 * Mirrors #cartPanel + #cartBackdrop in the prototype. Cart contents are
 * demo-only in this phase — Phase 7 ("Wishlist + cart") replaces them
 * with the real cart domain (guest/authenticated, variant-aware, server-
 * calculated totals per TRENDS_PROJECT_CONTEXT.md §4.3).
 */
export function CartDrawer() {
  const { isCartOpen, closeCart } = useUIOverlay();

  useEffect(() => {
    if (!isCartOpen) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCart();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isCartOpen, closeCart]);

  return (
    <>
      <div
        hidden={!isCartOpen}
        onClick={closeCart}
        aria-hidden="true"
        className="fixed inset-0 z-[90] bg-ink/30"
      />
      <aside
        aria-hidden={!isCartOpen}
        aria-label="سبد خرید"
        className={`fixed inset-y-0 right-0 z-[100] flex w-[min(360px,88vw)] flex-col bg-bg p-6 shadow-[-8px_0_30px_rgba(24,38,48,0.12)] transition-transform duration-[250ms] ease-out ${
          isCartOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="m-0 text-[1.05rem]">سبد خرید شما</h3>
          <button
            type="button"
            aria-label="بستن سبد خرید"
            onClick={closeCart}
            className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-ink/[0.06] text-base text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto">
          {demoCartItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div
                role="img"
                aria-label={item.name}
                className="h-16 w-14 shrink-0 rounded-[8px] bg-card-image"
              />
              <div>
                <p className="mb-1 text-[0.88rem] font-semibold">{item.name}</p>
                <p className="text-[0.82rem] text-text-secondary">{item.price}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-3.5 flex justify-between text-[0.92rem]">
            <span>جمع کل</span>
            <span>{demoCartTotal}</span>
          </div>
          <Button type="button" className="w-full justify-center">
            تسویه حساب
          </Button>
        </div>
      </aside>
    </>
  );
}
