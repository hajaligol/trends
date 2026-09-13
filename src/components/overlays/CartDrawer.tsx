"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { useUIOverlay } from "@/components/overlays/UIOverlayProvider";
import { useCart } from "@/components/cart/CartProvider";
import { formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * Mirrors #cartPanel + #cartBackdrop in the prototype. Real cart data
 * since Phase 7 — every line's price/stock is whatever
 * `CartProvider`/`getCartSummary` last read live from the database, not
 * a demo fixture. Checkout itself is Phase 8; the button below is
 * intentionally disabled with an explanatory label rather than linking
 * to a route that doesn't exist yet (rule G — no fake actions).
 */
export function CartDrawer() {
  const { isCartOpen, closeCart } = useUIOverlay();
  const { cart, isLoading, isMutating, updateQuantity, removeItem } = useCart();

  useEffect(() => {
    if (!isCartOpen) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCart();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isCartOpen, closeCart]);

  const hasUnavailableItems = cart.items.some((item) => !item.isAvailable);

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

        {isLoading ? (
          <p className="flex-1 text-center text-[0.88rem] text-text-secondary">در حال بارگذاری سبد خرید…</p>
        ) : cart.items.length === 0 ? (
          <p className="flex-1 text-center text-[0.9rem] text-text-secondary">سبد خرید شما خالی است.</p>
        ) : (
          <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto">
            {cart.items.map((item) => (
              <div key={item.itemId} className="flex items-center gap-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[8px] bg-card-image">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt ?? item.productTitle}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <AssetSlot label={item.productTitle} rounded="none" className="h-full w-full" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 truncate text-[0.88rem] font-semibold">{item.productTitle}</p>
                  <p className="mb-1 text-[0.78rem] text-text-secondary">
                    {item.size} / {item.color}
                  </p>
                  {item.isAvailable ? (
                    <>
                      <p className="mb-1 text-[0.82rem] text-text-secondary">{formatToman(item.unitPriceToman)}</p>
                      {item.isQuantityReduced && (
                        <p className="mb-1 text-[0.76rem] text-[#B0453C]">
                          فقط {toPersianDigits(item.stock)} عدد موجود است
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="کاهش تعداد"
                          disabled={isMutating}
                          onClick={() => updateQuantity(item.itemId, item.requestedQuantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-ink disabled:opacity-50"
                        >
                          −
                        </button>
                        <span className="min-w-[1.25rem] text-center text-[0.85rem]">
                          {toPersianDigits(item.requestedQuantity)}
                        </span>
                        <button
                          type="button"
                          aria-label="افزایش تعداد"
                          disabled={isMutating || item.requestedQuantity >= item.stock}
                          onClick={() => updateQuantity(item.itemId, item.requestedQuantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-ink disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-[0.8rem] text-[#B0453C]">این کالا دیگر موجود نیست</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`حذف «${item.productTitle}» از سبد خرید`}
                  disabled={isMutating}
                  onClick={() => removeItem(item.itemId)}
                  className="shrink-0 text-[0.78rem] text-text-secondary underline decoration-dotted disabled:opacity-50"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-3.5 flex justify-between text-[0.92rem]">
            <span>جمع کل</span>
            <span>{formatToman(cart.subtotalToman)}</span>
          </div>
          {hasUnavailableItems && (
            <p className="mb-3 text-[0.78rem] text-[#B0453C]">
              برخی کالاها دیگر موجود نیستند و در جمع کل محاسبه نشده‌اند.
            </p>
          )}
          {cart.items.length === 0 || hasUnavailableItems ? (
            <Button type="button" disabled className="w-full justify-center opacity-60">
              تسویه حساب
            </Button>
          ) : (
            <Link
              href="/checkout"
              onClick={closeCart}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border-0 bg-ink px-[30px] py-[15px] text-[0.95rem] text-white transition-opacity duration-200 ease-out hover:opacity-88"
            >
              تسویه حساب
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
