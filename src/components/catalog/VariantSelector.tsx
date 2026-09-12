"use client";

import { useState } from "react";
import type { CatalogProductVariant } from "@/domains/catalog/queries";
import { discountPercent, formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { StockBadge } from "@/components/catalog/StockBadge";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { useUIOverlay } from "@/components/overlays/UIOverlayProvider";

/**
 * Size/color picker plus a real "add to cart" control, for a product's
 * active variants. Today's seed data only ever gives a product one size
 * shared across all its colors (see `seed.ts`'s `variantsFor`), but this
 * doesn't assume that: picking a size/color combination that doesn't
 * exist as a variant falls back to the nearest real combination, so it
 * stays correct once Phase 11 lets an admin enter a real size run.
 *
 * "Add to cart" (Phase 7) calls `addToCartAction` with the *variant's
 * id* — never its price — the server re-reads price/stock from
 * `product_variants` itself (`src/domains/cart/queries.ts`'s
 * `addItemToCart`), so nothing this component displays is trusted as
 * authoritative (rule A.11).
 */
export function VariantSelector({ variants }: { variants: CatalogProductVariant[] }) {
  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const colorMap = new Map<string, string | null>();
  for (const variant of variants) {
    if (!colorMap.has(variant.color)) colorMap.set(variant.color, variant.colorHex);
  }
  const colors = [...colorMap.entries()].map(([color, colorHex]) => ({ color, colorHex }));

  const firstVariant = variants[0];
  const [selectedSize, setSelectedSize] = useState(firstVariant?.size ?? "");
  const [selectedColor, setSelectedColor] = useState(firstVariant?.color ?? "");
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { addItem, isMutating } = useCart();
  const { openCart } = useUIOverlay();

  const selectedVariant =
    variants.find((variant) => variant.size === selectedSize && variant.color === selectedColor) ??
    firstVariant ??
    null;

  function selectSize(size: string) {
    setSelectedSize(size);
    setFeedback(null);
    const stillValid = variants.some((variant) => variant.size === size && variant.color === selectedColor);
    if (!stillValid) {
      const fallback = variants.find((variant) => variant.size === size);
      if (fallback) setSelectedColor(fallback.color);
    }
  }

  function selectColor(color: string) {
    setSelectedColor(color);
    setFeedback(null);
    const stillValid = variants.some((variant) => variant.size === selectedSize && variant.color === color);
    if (!stillValid) {
      const fallback = variants.find((variant) => variant.color === color);
      if (fallback) setSelectedSize(fallback.size);
    }
  }

  if (!selectedVariant) {
    return <p className="text-[0.9rem] text-text-secondary">این محصول در حال حاضر تنوعی برای انتخاب ندارد.</p>;
  }

  const percent = discountPercent(selectedVariant.compareAtPriceToman, selectedVariant.priceToman);
  const isOutOfStock = selectedVariant.stockState === "out-of-stock";
  const maxQuantity = Math.max(selectedVariant.stock, 0);

  async function handleAddToCart() {
    if (!selectedVariant) return;
    setFeedback(null);
    const ok = await addItem(selectedVariant.id, quantity);
    if (ok) {
      setFeedback({ type: "success", message: "به سبد خرید اضافه شد" });
      openCart();
    } else {
      setFeedback({ type: "error", message: "افزودن به سبد خرید ممکن نشد" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[1.35rem] font-semibold">{formatToman(selectedVariant.priceToman)}</span>
        {percent > 0 && selectedVariant.compareAtPriceToman !== null && (
          <>
            <span className="text-[0.95rem] text-text-secondary line-through">
              {formatToman(selectedVariant.compareAtPriceToman)}
            </span>
            <span className="rounded-full bg-blush px-2.5 py-0.5 text-[0.8rem] font-semibold text-ink">
              {toPersianDigits(percent)}٪
            </span>
          </>
        )}
      </div>

      {sizes.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="ms-1 text-[0.85rem] text-text-secondary">سایز:</span>
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => selectSize(size)}
              aria-pressed={selectedSize === size}
              className={`rounded-full border px-3 py-1 text-[0.82rem] ${
                selectedSize === size ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-ink"
              }`}
            >
              {toPersianDigits(size)}
            </button>
          ))}
        </div>
      )}

      {colors.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="ms-1 text-[0.85rem] text-text-secondary">رنگ:</span>
          {colors.map(({ color, colorHex }) => (
            <button
              key={color}
              type="button"
              onClick={() => selectColor(color)}
              aria-pressed={selectedColor === color}
              title={color}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.82rem] ${
                selectedColor === color ? "border-ink text-ink" : "border-line text-text-secondary hover:border-ink"
              }`}
            >
              {colorHex && (
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: colorHex }}
                  className="h-2.5 w-2.5 rounded-full border border-ink/15"
                />
              )}
              {color}
            </button>
          ))}
        </div>
      )}

      <StockBadge state={selectedVariant.stockState} />

      {!isOutOfStock && (
        <div className="flex items-center gap-2">
          <span className="text-[0.85rem] text-text-secondary">تعداد:</span>
          <button
            type="button"
            aria-label="کاهش تعداد"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={quantity <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink disabled:opacity-50"
          >
            −
          </button>
          <span className="min-w-[1.5rem] text-center text-[0.9rem]">{toPersianDigits(quantity)}</span>
          <button
            type="button"
            aria-label="افزایش تعداد"
            onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
            disabled={quantity >= maxQuantity}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink disabled:opacity-50"
          >
            +
          </button>
        </div>
      )}

      <Button
        type="button"
        disabled={isOutOfStock || isMutating}
        onClick={handleAddToCart}
        className="w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isOutOfStock ? "ناموجود" : "افزودن به سبد خرید"}
      </Button>

      {feedback && (
        <p
          role="status"
          className={`text-[0.85rem] ${feedback.type === "success" ? "text-[#4C7A5D]" : "text-[#B0453C]"}`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
