"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CartLineItem } from "@/domains/cart/queries";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { buttonClasses } from "@/components/ui/Button";
import { HeartIcon, XIcon } from "@/components/ui/icons";
import { useDialogA11y } from "@/lib/hooks/useDialogA11y";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * Asked before a cart line is removed: «حذف کالا» (red, removes),
 * «انصراف» (closes, nothing changes) or «افزودن به علاقه‌مندی‌ها»
 * (purple, saves the product to the wishlist and then removes it from the
 * cart — i.e. "move to wishlist"). The caller owns the actual cart /
 * wishlist mutations; this component only renders and reports the choice.
 *
 * Guests have no persisted wishlist (see `WishlistButton`), so for them
 * the third button explains that sign-in is needed instead of pretending
 * to save — the cart line is left untouched.
 *
 * Focus starts on «انصراف» so an accidental Enter never deletes anything.
 */
export function RemoveFromCartModal({
  item,
  busy,
  error,
  isAuthenticated,
  guestNotice,
  onClose,
  onRemove,
  onMoveToWishlist,
}: {
  item: CartLineItem | null;
  busy: boolean;
  error: string | null;
  isAuthenticated: boolean;
  guestNotice: boolean;
  onClose: () => void;
  onRemove: () => void;
  onMoveToWishlist: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useDialogA11y(item !== null, onClose, panelRef, cancelRef);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={busy ? undefined : onClose} className="modal-backdrop-in absolute inset-0 bg-ink/40" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-from-cart-title"
        className="modal-panel-in relative w-full max-w-[420px] rounded-[var(--radius-lg)] bg-bg p-6 text-center shadow-[0_24px_60px_-20px_rgba(24,38,48,0.45)] sm:p-8"
      >
        <button
          type="button"
          aria-label="بستن"
          onClick={onClose}
          disabled={busy}
          className="absolute end-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-ink/[0.06] text-ink disabled:opacity-50"
        >
          <XIcon className="h-[18px] w-[18px]" />
        </button>

        <span className="relative mx-auto mb-4 block h-[84px] w-[70px] overflow-hidden rounded-[var(--radius-md)] bg-card-image">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt="" fill sizes="70px" className="object-cover" />
          ) : (
            <AssetSlot label={item.productTitle} rounded="none" className="h-full w-full" />
          )}
        </span>
        <h2 id="remove-from-cart-title" className="m-0 mb-2 text-[1.1rem] font-bold">
          این کالا از سبد خرید حذف شود؟
        </h2>
        <p className="m-0 mb-1 text-[0.92rem] font-semibold text-ink">{item.productTitle}</p>
        <p className="m-0 mb-6 text-[0.84rem] text-text-secondary">
          سایز {toPersianDigits(item.size)} · {item.color} · {toPersianDigits(item.requestedQuantity)} عدد
        </p>

        <div className="flex flex-col gap-3">
          <button type="button" disabled={busy} onClick={onRemove} className={buttonClasses("danger", "md", "w-full disabled:opacity-60")}>
            حذف کالا
          </button>
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onClose}
            className={buttonClasses("outline", "md", "w-full disabled:opacity-60")}
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onMoveToWishlist}
            className={buttonClasses("brand", "md", "w-full disabled:opacity-60")}
          >
            <HeartIcon aria-hidden="true" strokeWidth={1.5} className="h-5 w-5 shrink-0" />
            افزودن به علاقه‌مندی‌ها
          </button>
        </div>

        {!isAuthenticated && guestNotice && (
          <p role="alert" className="mt-4 mb-0 text-[0.84rem] text-text-secondary">
            برای ذخیره علاقه‌مندی‌ها ابتدا{" "}
            <Link href="/login" className="font-semibold text-brand underline underline-offset-2">
              وارد حساب کاربری
            </Link>{" "}
            شوید. کالا از سبد خرید حذف نشد.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 mb-0 text-[0.84rem] text-[#B0453C]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
