"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { CartIcon, XIcon } from "@/components/ui/icons";
import { useDialogA11y } from "@/lib/hooks/useDialogA11y";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * Shown when the customer presses "افزودن به سبد خرید" without having chosen
 * a size. The size can be picked right here; confirming hands control back to
 * the selector, which adds the item. Display state only — the cart action
 * still receives just a variant id and the server re-reads price/stock.
 *
 * Dialog semantics, focus trap, Escape-to-close and focus restore come from
 * `useDialogA11y`, as in `AddedToCartModal`. Mounted only while open.
 */
export function SizePickerModal({
  open,
  onClose,
  sizes,
  selectedSize,
  isSizeAvailable,
  onSelectSize,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  sizes: string[];
  selectedSize: string;
  isSizeAvailable: (size: string) => boolean;
  onSelectSize: (size: string) => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, onClose, panelRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={onClose} className="modal-backdrop-in absolute inset-0 bg-ink/40" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-picker-title"
        className="modal-panel-in relative w-full max-w-[400px] rounded-[var(--radius-lg)] bg-bg p-6 text-center shadow-[0_24px_60px_-20px_rgba(24,38,48,0.45)] sm:p-8"
      >
        <button
          type="button"
          aria-label="بستن"
          onClick={onClose}
          className="absolute end-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-ink/[0.06] text-ink"
        >
          <XIcon className="h-[18px] w-[18px]" />
        </button>

        <h2 id="size-picker-title" className="m-0 mb-2 text-[1.15rem] font-bold">
          لطفاً سایز را انتخاب کنید
        </h2>
        <p className="m-0 mb-6 text-[0.88rem] text-text-secondary">
          برای افزودن این محصول به سبد خرید، ابتدا سایز مورد نظر را انتخاب کنید.
        </p>

        <div role="group" aria-labelledby="size-picker-title" className="mb-6 flex flex-wrap justify-center gap-2">
          {sizes.map((size) => {
            const available = isSizeAvailable(size);
            const selected = selectedSize === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => onSelectSize(size)}
                disabled={!available}
                aria-pressed={selected}
                title={available ? undefined : "ناموجود"}
                className={`min-h-11 min-w-11 rounded-full border px-4 text-[0.88rem] transition-colors duration-200 ${
                  !available
                    ? "cursor-not-allowed border-line bg-white text-text-secondary line-through opacity-45"
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

        <Button
          type="button"
          variant="brand"
          disabled={!selectedSize || busy}
          onClick={onConfirm}
          className="w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CartIcon aria-hidden="true" strokeWidth={1.5} className="h-[22px] w-[22px] shrink-0" />
          افزودن به سبد خرید
        </Button>
      </div>
    </div>
  );
}
