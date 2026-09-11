"use client";

import { useState } from "react";
import type { CatalogProductVariant } from "@/domains/catalog/queries";
import { discountPercent, formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { StockBadge } from "@/components/catalog/StockBadge";

/**
 * Size/color picker for a product's active variants. Today's seed data
 * only ever gives a product one size shared across all its colors (see
 * `seed.ts`'s `variantsFor`), but this doesn't assume that: picking a
 * size/color combination that doesn't exist as a variant falls back to
 * the nearest real combination, so it stays correct once Phase 11 lets an
 * admin enter a real size run.
 *
 * No "add to cart" action here — cart/checkout mutations are Phase 7/8.
 * Showing a button that doesn't add anything to a real cart would be a
 * fake action (rule G), so the picker is display-only for now.
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

  const selectedVariant =
    variants.find((variant) => variant.size === selectedSize && variant.color === selectedColor) ??
    firstVariant ??
    null;

  function selectSize(size: string) {
    setSelectedSize(size);
    const stillValid = variants.some((variant) => variant.size === size && variant.color === selectedColor);
    if (!stillValid) {
      const fallback = variants.find((variant) => variant.size === size);
      if (fallback) setSelectedColor(fallback.color);
    }
  }

  function selectColor(color: string) {
    setSelectedColor(color);
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
    </div>
  );
}
