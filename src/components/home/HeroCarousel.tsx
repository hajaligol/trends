"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/** Structural type, not a specific table's row — the carousel only ever
 * needs an `id` (React key / dot target), `alt` text, and an optional
 * `imageUrl`; whether the caller sourced that from `hero_slides` (Phase
 * 11, the real path) or a future different content source doesn't
 * matter to this component. */
type HeroSlideLike = { id: string; alt: string; imageUrl: string | null };

const AUTOPLAY_DELAY_MS = 5000;
const SWIPE_THRESHOLD_RATIO = 0.15;

/**
 * Image-only hero banner carousel: autoplay, dots, and
 * mouse/touch drag-to-swipe. Mirrors #heroCarousel in
 * reference/prototype.html, reimplemented as a real component with React
 * state/effects instead of the prototype's inline <script>, per
 * CLAUDE_BUILD_INSTRUCTIONS.txt §E ("no hardcoded inline-JS
 * architecture"). Slides come from `hero_slides` (Phase 11,
 * `/admin/content`) via `src/app/page.tsx`, not a hardcoded fixture.
 */
export function HeroCarousel({ slides }: { slides: HeroSlideLike[] }) {
  const slideCount = slides.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffsetPercent, setDragOffsetPercent] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const autoplayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const deltaXRef = useRef(0);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(((index % slideCount) + slideCount) % slideCount);
    },
    [slideCount],
  );

  const stopAutoplay = useCallback(() => {
    if (autoplayTimer.current !== null) {
      clearInterval(autoplayTimer.current);
      autoplayTimer.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    if (slideCount < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    autoplayTimer.current = setInterval(() => {
      setCurrentIndex((index) => (index + 1) % slideCount);
    }, AUTOPLAY_DELAY_MS);
  }, [slideCount, stopAutoplay]);

  useEffect(() => {
    startAutoplay();
    return stopAutoplay;
  }, [startAutoplay, stopAutoplay]);

  // Mouse/touch drag-to-swipe, mirroring the prototype's carousel JS.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || slideCount < 2) return undefined;

    function clientXOf(event: MouseEvent | TouchEvent): number {
      if ("touches" in event) {
        return event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX ?? 0;
      }
      return event.clientX;
    }

    function onDown(event: MouseEvent | TouchEvent) {
      draggingRef.current = true;
      startXRef.current = clientXOf(event);
      deltaXRef.current = 0;
      setIsDragging(true);
      stopAutoplay();
    }

    function onMove(event: MouseEvent | TouchEvent) {
      if (!draggingRef.current || !wrap) return;
      deltaXRef.current = clientXOf(event) - startXRef.current;
      setDragOffsetPercent((deltaXRef.current / wrap.offsetWidth) * 100);
    }

    function onUp() {
      if (!draggingRef.current || !wrap) return;
      draggingRef.current = false;
      setIsDragging(false);
      setDragOffsetPercent(0);
      const threshold = wrap.offsetWidth * SWIPE_THRESHOLD_RATIO;
      if (deltaXRef.current > threshold) {
        goTo(currentIndex - 1);
      } else if (deltaXRef.current < -threshold) {
        goTo(currentIndex + 1);
      }
      startAutoplay();
    }

    wrap.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    wrap.addEventListener("touchstart", onDown, { passive: true });
    wrap.addEventListener("touchmove", onMove, { passive: true });
    wrap.addEventListener("touchend", onUp);

    return () => {
      wrap.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      wrap.removeEventListener("touchstart", onDown);
      wrap.removeEventListener("touchmove", onMove);
      wrap.removeEventListener("touchend", onUp);
    };
  }, [currentIndex, goTo, slideCount, startAutoplay, stopAutoplay]);

  if (slideCount === 0) return null;

  const translatePercent = -currentIndex * 100 + dragOffsetPercent;

  return (
    <div
      ref={wrapRef}
      id="heroCarousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="بنرهای تبلیغاتی"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
      style={{ touchAction: "pan-y" }}
      className="relative aspect-[21/8] w-full cursor-grab overflow-hidden rounded-[22px] bg-gradient-to-br from-[#E7DFD2] to-[#DED4C4] active:cursor-grabbing max-[640px]:aspect-[4/3.4]"
    >
      <div
        style={{
          direction: "ltr",
          transform: `translateX(${translatePercent}%)`,
          transition: isDragging ? "none" : "transform 320ms ease",
          willChange: "transform",
        }}
        className="flex h-full w-full"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="اسلاید"
            aria-label={`${toPersianDigits(index + 1)} از ${toPersianDigits(slideCount)}`}
            className="relative h-full w-full shrink-0 basis-full"
          >
            {slide.imageUrl ? (
              <Image
                src={slide.imageUrl}
                alt={slide.alt}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <AssetSlot label={slide.alt} tone="banner" rounded="none" className="h-full w-full" />
            )}
          </div>
        ))}
      </div>

      {slideCount > 1 && (
        <>
          <div className="absolute bottom-4 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-1.5">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`رفتن به اسلاید ${toPersianDigits(index + 1)}`}
                onClick={() => {
                  goTo(index);
                  startAutoplay();
                }}
                className={
                  index === currentIndex
                    ? "h-2 w-[22px] rounded border-[1.5px] border-ink bg-white transition-[width,background-color,border-radius] duration-200"
                    : "h-2 w-2 rounded-full border-[1.5px] border-ink bg-bg/60 transition-[width,background-color,border-radius] duration-200"
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
