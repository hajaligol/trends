"use client";

import { useState, type ReactNode } from "react";
import type { CatalogProductVariant } from "@/domains/catalog/queries";
import { discountPercent, formatToman } from "@/lib/utils/money";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { StockBadge } from "@/components/catalog/StockBadge";
import { Button } from "@/components/ui/Button";
import { CartIcon } from "@/components/ui/icons";
import { AddedToCartModal } from "@/components/catalog/AddedToCartModal";
import { useCart } from "@/components/cart/CartProvider";
import { useProductColor } from "@/components/catalog/ProductColorContext";

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
function isInStock(variant: CatalogProductVariant) {
  return variant.stockState !== "out-of-stock";
}

export function VariantSelector({
  variants,
  secondaryAction,
}: {
  variants: CatalogProductVariant[];
  /** Rendered beside the add-to-cart button (the page passes the wishlist toggle). */
  secondaryAction?: ReactNode;
}) {
  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const colorMap = new Map<string, string | null>();
  for (const variant of variants) {
    if (!colorMap.has(variant.color)) colorMap.set(variant.color, variant.colorHex);
  }
  const colors = [...colorMap.entries()].map(([color, colorHex]) => ({ color, colorHex }));

  // Start on a purchasable variant when there is one.
  const firstVariant = variants.find(isInStock) ?? variants[0];
  const [selectedSize, setSelectedSize] = useState(firstVariant?.size ?? "");
  // The colour is shared with the gallery, which shows that colour's photos.
  const { selectedColor, setSelectedColor } = useProductColor();
  const [quantity, setQuantity] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { addItem, isMutating } = useCart();
  const [addedInfo, setAddedInfo] = useState<{ size: string; color: string; colorHex: string | null; quantity: number } | null>(null);

  const selectedVariant =
    variants.find((variant) => variant.size === selectedSize && variant.color === selectedColor) ??
    firstVariant ??
    null;

  /** A size can be chosen only if the selected colour has it in stock. */
  function isSizeAvailable(size: string) {
    return variants.some((variant) => variant.size === size && variant.color === selectedColor && isInStock(variant));
  }

  function selectSize(size: string) {
    if (!isSizeAvailable(size)) return;
    setSelectedSize(size);
    setQuantity(1);
    setErrorMessage(null);
  }

  function selectColor(color: string) {
    setSelectedColor(color);
    setQuantity(1);
    setErrorMessage(null);
    // Keep the current size if this colour has it in stock; otherwise move to
    // the first size of this colour that is in stock (or any size, so an
    // entirely sold-out colour still shows its «ناموجود» state).
    const keep = variants.some((variant) => variant.size === selectedSize && variant.color === color && isInStock(variant));
    if (!keep) {
      const fallback =
        variants.find((variant) => variant.color === color && isInStock(variant)) ??
        variants.find((variant) => variant.color === color);
      if (fallback) setSelectedSize(fallback.size);
    }
  }

  if (!selectedVariant) {
    return <p className="text-[0.9rem] text-text-secondary">این محصول در حال حاضر تنوعی برای انتخاب ندارد.</p>;
  }

  const percent = discountPercent(selectedVariant.compareAtPriceToman, selectedVariant.priceToman);
  const isOutOfStock = selectedVariant.stockState === "out-of-stock";
  const isLowStock = selectedVariant.stockState === "low-stock";
  const maxQuantity = Math.max(selectedVariant.stock, 0);

  async function handleAddToCart() {
    if (!selectedVariant) return;
    setErrorMessage(null);
    const ok = await addItem(selectedVariant.id, quantity);
    if (ok) {
      setAddedInfo({
        size: selectedVariant.size,
        color: selectedVariant.color,
        colorHex: selectedVariant.colorHex,
        quantity,
      });
    } else {
      setErrorMessage("افزودن به سبد خرید ممکن نشد");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AddedToCartModal
        open={addedInfo !== null}
        onClose={() => setAddedInfo(null)}
        size={addedInfo?.size ?? ""}
        color={addedInfo?.color ?? ""}
        colorHex={addedInfo?.colorHex ?? null}
        quantity={addedInfo?.quantity ?? 1}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[1.65rem] leading-tight font-bold">{formatToman(selectedVariant.priceToman)}</span>
        {percent > 0 && selectedVariant.compareAtPriceToman !== null && (
          <>
            <span className="text-[0.98rem] text-text-secondary line-through">
              {formatToman(selectedVariant.compareAtPriceToman)}
            </span>
            <span className="rounded-full bg-blush px-3 py-1 text-[0.8rem] font-semibold text-ink">
              {toPersianDigits(percent)}٪ تخفیف
            </span>
          </>
        )}
      </div>

      {sizes.length > 1 && (
        <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[0.88rem] text-text-secondary">
            سایز: <span className="font-semibold text-ink">{toPersianDigits(selectedSize)}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const available = isSizeAvailable(size);
              const selected = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => selectSize(size)}
                  disabled={!available}
                  aria-pressed={selected}
                  title={available ? undefined : "ناموجود"}
                  className={`min-h-11 min-w-11 rounded-full border px-4 text-[0.88rem] transition-colors duration-200 ${
                    !available
                      ? `cursor-not-allowed border-line bg-white text-text-secondary line-through opacity-45 ${selected ? "border-ink/40" : ""}`
                      : selected
                        ? "cursor-pointer border-ink bg-ink text-white"
                        : "cursor-pointer border-line bg-white text-ink hover:border-ink"
                  }`}
                >
                  {toPersianDigits(size)}
                  {!available && <span className="sr-only"> (ناموجود)</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {colors.length > 1 && (
        <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[0.88rem] text-text-secondary">
            رنگ: <span className="font-semibold text-ink">{selectedColor}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {colors.map(({ color, colorHex }) => {
              const selected = selectedColor === color;
              return colorHex ? (
                <button
                  key={color}
                  type="button"
                  onClick={() => selectColor(color)}
                  aria-pressed={selected}
                  aria-label={color}
                  title={color}
                  className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition-colors duration-200 ${
                    selected ? "border-ink" : "border-transparent hover:border-ink/40"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: colorHex }}
                    className="h-7 w-7 rounded-full border border-ink/15"
                  />
                </button>
              ) : (
                <button
                  key={color}
                  type="button"
                  onClick={() => selectColor(color)}
                  aria-pressed={selected}
                  className={`min-h-11 cursor-pointer rounded-full border px-4 text-[0.88rem] transition-colors duration-200 ${
                    selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"
                  }`}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {isLowStock && (
        <p className="text-[0.85rem] font-medium text-[#B8873A]">
          تنها {toPersianDigits(selectedVariant.stock)} عدد در انبار باقی مانده است
        </p>
      )}
      {isOutOfStock && <StockBadge state="out-of-stock" />}

      <div className="flex flex-col gap-3">
        {!isOutOfStock && (
          <div className="flex items-center gap-3">
            <span className="text-[0.88rem] text-text-secondary">تعداد</span>
            <div className="inline-flex items-center rounded-full border border-line bg-white">
              <button
                type="button"
                aria-label="کاهش تعداد"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[1.1rem] text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                −
              </button>
              <span aria-live="polite" className="min-w-8 text-center text-[0.95rem] font-semibold">
                {toPersianDigits(quantity)}
              </span>
              <button
                type="button"
                aria-label="افزایش تعداد"
                onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                disabled={quantity >= maxQuantity}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[1.1rem] text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="brand"
            disabled={isOutOfStock || isMutating}
            onClick={handleAddToCart}
            className="flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!isOutOfStock && <CartIcon aria-hidden="true" strokeWidth={1.5} className="h-[22px] w-[22px] shrink-0" />}
            {isOutOfStock ? "ناموجود" : "افزودن به سبد خرید"}
          </Button>
          {secondaryAction}
        </div>

        {errorMessage && (
          <p role="alert" className="text-[0.85rem] text-[#B0453C]">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
