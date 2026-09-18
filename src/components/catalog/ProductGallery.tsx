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

  if (images.length === 0) {
    return (
      <div className="aspect-[4/5] w-full overflow-hidden rounded-[18px] bg-card-image lg:aspect-auto lg:h-[calc(100vh-170px)] lg:min-h-[420px]">
        <AssetSlot label={title} rounded="none" className="h-full w-full" />
      </div>
    );
  }

  const active = images[activeIndex] ?? images[0];
  if (!active) return null;

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-170px)] lg:min-h-[420px]">
      <div className="relative aspect-[4/5] w-full min-h-0 flex-1 overflow-hidden rounded-[18px] bg-card-image lg:aspect-auto">
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
        <div className="flex shrink-0 gap-2.5">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-current={index === activeIndex}
              aria-label={`تصویر ${index + 1}`}
              className={`relative h-16 w-16 overflow-hidden rounded-[10px] border transition-colors ${
                index === activeIndex ? "border-ink" : "border-transparent"
              }`}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
