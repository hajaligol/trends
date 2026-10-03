"use client";

import { useRef } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { CartIcon, CheckIcon, XIcon } from "@/components/ui/icons";
import { useDialogA11y } from "@/lib/hooks/useDialogA11y";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * Confirmation shown after a successful add-to-cart, replacing the old
 * toast: "مشاهده سبد خرید" (purple, goes to /checkout where the cart is
 * stage 1) or "ادامه خرید" (just closes). Dialog semantics, focus trap,
 * Escape-to-close and focus restore come from `useDialogA11y`, the same
 * hook the search overlay uses. Clicking the backdrop also closes it.
 * Mounted only while open, so it costs nothing on the product page.
 */
export function AddedToCartModal({
  open,
  onClose,
  size,
  color,
  colorHex,
  quantity,
}: {
  open: boolean;
  onClose: () => void;
  size: string;
  color: string;
  colorHex: string | null;
  quantity: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  useDialogA11y(open, onClose, panelRef, continueRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={onClose} className="modal-backdrop-in absolute inset-0 bg-ink/40" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="added-to-cart-title"
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

        <span
          aria-hidden="true"
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-aqua text-ink"
        >
          <CheckIcon width={30} height={30} strokeWidth={2} />
        </span>
        <h2 id="added-to-cart-title" className="m-0 mb-2 text-[1.15rem] font-bold">
          محصول به سبد خرید اضافه شد
        </h2>
        <p className="m-0 mb-6 flex flex-wrap items-center justify-center gap-x-2 text-[0.88rem] text-text-secondary">
          <span>سایز {toPersianDigits(size)}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            {colorHex && (
              <span
                aria-hidden="true"
                style={{ backgroundColor: colorHex }}
                className="h-3.5 w-3.5 rounded-full border border-ink/15"
              />
            )}
            {color}
          </span>
          <span aria-hidden="true">·</span>
          <span>{toPersianDigits(quantity)} عدد</span>
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/checkout" onClick={onClose} className={buttonClasses("brand", "md", "w-full")}>
            <CartIcon aria-hidden="true" strokeWidth={1.5} className="h-[22px] w-[22px] shrink-0" />
            مشاهده سبد خرید
          </Link>
          <button
            ref={continueRef}
            type="button"
            onClick={onClose}
            className={buttonClasses("outline", "md", "w-full")}
          >
            ادامه خرید
          </button>
        </div>
      </div>
    </div>
  );
}
