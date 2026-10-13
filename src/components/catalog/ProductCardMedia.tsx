"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AssetSlot } from "@/components/ui/AssetSlot";
import type { CatalogColorOption } from "@/domains/catalog/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type CardImage = { url: string; altText: string };

/**
 * The image area of a product card, plus its hover panel: the product's
 * colours and the sizes in stock for the colour being looked at. Hovering
 * (or keyboard-focusing) a colour previews that colour's photo; clicking it
 * opens the product page with that colour already selected (`?color=`).
 *
 * The panel only exists on devices that can hover (`@media (hover: hover)`
 * via the `hover:` variant); on touch screens the card is just the image
 * link, as before. It is a sibling of the link, never inside it (buttons
 * inside an <a> are invalid and break keyboard/AT navigation).
 *
 * Display only — price, stock and the cart still come from the server.
 */
export function ProductCardMedia({
  title,
  href,
  colorOptions,
  sharedImage,
  sizes = "(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw",
  children,
}: {
  title: string;
  href: string;
  colorOptions: CatalogColorOption[];
  sharedImage: CardImage | null;
  /** `next/image` sizes hint for the card's grid. */
  sizes?: string;
  /** Server-rendered overlays (discount badge, wishlist button). */
  children?: ReactNode;
}) {
  // Start on a colour that can actually be bought.
  const defaultColor = (colorOptions.find((option) => option.sizes.length > 0) ?? colorOptions[0])?.color ?? null;
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  // Other colours' images are only mounted once the user engages with the
  // card, so a grid of cards doesn't download every colour up front.
  const [engaged, setEngaged] = useState(false);

  const shownColor = previewColor ?? defaultColor;
  const shownOption = colorOptions.find((option) => option.color === shownColor) ?? null;

  const imageFor = (option: CatalogColorOption | null): CardImage | null =>
    option?.image ?? sharedImage;
  const shownImage = imageFor(shownOption);

  // Distinct images to stack (active one visible, the rest preloaded).
  const stacked: CardImage[] = [];
  if (shownImage) stacked.push(shownImage);
  if (engaged) {
    for (const option of colorOptions) {
      const image = imageFor(option);
      if (image && !stacked.some((entry) => entry.url === image.url)) stacked.push(image);
    }
  }

  const showPanel = colorOptions.length > 1 || (colorOptions[0]?.sizes.length ?? 0) > 0;

  return (
    <div
      className="group relative aspect-[4/5] overflow-hidden rounded-[14px] bg-card-image"
      onPointerEnter={() => setEngaged(true)}
      onFocusCapture={() => setEngaged(true)}
    >
      <Link href={href} className="absolute inset-0 block">
        {stacked.length > 0 ? (
          stacked.map((image) => (
            <Image
              key={image.url}
              src={image.url}
              alt={image.url === shownImage?.url ? image.altText : ""}
              aria-hidden={image.url === shownImage?.url ? undefined : true}
              fill
              sizes={sizes}
              className={`object-cover transition-opacity duration-300 motion-reduce:transition-none ${
                image.url === shownImage?.url ? "opacity-100" : "opacity-0"
              }`}
            />
          ))
        ) : (
          <AssetSlot label={title} rounded="none" className="h-full w-full" />
        )}
      </Link>
      {children}

      {showPanel && (
        <div
          onPointerLeave={() => setPreviewColor(null)}
          className="pointer-events-none absolute inset-x-2 bottom-2 hidden translate-y-1 flex-col gap-2 rounded-[10px] bg-white/92 p-2.5 opacity-0 backdrop-blur-sm transition-[opacity,transform] duration-200 motion-reduce:transition-none [@media(hover:hover)]:flex group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
        >
          {colorOptions.length > 1 && (
            <div role="group" aria-label="رنگ‌ها" className="flex flex-wrap items-center gap-1.5">
              {colorOptions.map((option) => {
                const active = option.color === shownColor;
                return (
                  <Link
                    key={option.color}
                    href={`${href}?color=${encodeURIComponent(option.color)}`}
                    aria-label={`${option.color} — مشاهده در صفحه‌ی محصول`}
                    title={option.color}
                    onPointerEnter={() => setPreviewColor(option.color)}
                    onFocus={() => setPreviewColor(option.color)}
                    onBlur={() => setPreviewColor(null)}
                    className={`grid h-7 w-7 place-items-center rounded-full border transition-colors duration-150 ${
                      active ? "border-ink" : "border-transparent hover:border-ink/40"
                    }`}
                  >
                    {option.colorHex ? (
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: option.colorHex }}
                        className="h-4.5 w-4.5 rounded-full border border-ink/15"
                      />
                    ) : (
                      <span className="max-w-6 truncate text-[0.62rem]">{option.color}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          <p className="m-0 flex flex-wrap items-center gap-1 text-[0.72rem]" aria-live="polite">
            {shownOption && shownOption.sizes.length > 0 ? (
              <>
                <span className="sr-only">سایزهای موجود:</span>
                {shownOption.sizes.map((size) => (
                  <span key={size} className="min-w-6 rounded-full border border-line bg-white px-2 py-0.5 text-center text-ink">
                    {toPersianDigits(size)}
                  </span>
                ))}
              </>
            ) : (
              <span className="text-text-secondary">ناموجود</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
