"use client";

import { useState } from "react";
import Image from "next/image";
import { AssetSlot } from "@/components/ui/AssetSlot";

/**
 * No real product photography exists yet (see catalog `seed.ts`), so in
 * practice every product renders through the `AssetSlot` placeholder
 * branch today. The real-image path is still implemented so Phase 11's
 * admin media upload has a working gallery to plug into.
 */
export function ProductGallery({
  title,
  images,
}: {
  title: string;
  images: Array<{ url: string; altText: string }>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Caps the image's rendered width (height then follows from the 4/5
  // ratio) so it can never grow taller than the viewport allows, while
  // always keeping the true 4/5 shape — rather than distorting the
  // ratio at large breakpoints the way a max-height-only cap would.
  // 170px accounts for the sticky header, page padding, and
  // breadcrumbs above the gallery; the thumbnail row (with images.length
  // > 1) adds its own height on top, so it gets a bigger allowance.
  const maxWidthStyle = { maxWidth: "min(100%, calc((100vh - 170px) * 4 / 5))" };
  const maxWidthWithThumbnailsStyle = { maxWidth: "min(100%, calc((100vh - 260px) * 4 / 5))" };

  if (images.length === 0) {
    return (
      <div
        style={maxWidthStyle}
        className="mx-auto aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-lg)] bg-card-image"
      >
        <AssetSlot label={title} rounded="none" className="h-full w-full" />
      </div>
    );
  }

  const active = images[activeIndex] ?? images[0];
  if (!active) return null;

  return (
    <div className="flex flex-col gap-3">
      <div
        style={images.length > 1 ? maxWidthWithThumbnailsStyle : maxWidthStyle}
        className="relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-lg)] bg-card-image"
      >
        <Image
          src={active.url}
          alt={active.altText}
          fill
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div style={maxWidthWithThumbnailsStyle} className="mx-auto flex w-full gap-2.5 overflow-x-auto p-0.5">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-current={index === activeIndex}
              aria-label={`تصویر ${index + 1}`}
              className={`relative h-[72px] w-[58px] shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border bg-card-image transition-[border-color,opacity] duration-200 ${
                index === activeIndex ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={image.url} alt="" fill sizes="58px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
