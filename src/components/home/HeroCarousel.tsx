"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import { safeHref } from "@/lib/utils/safe-href";

/** Structural type, not a specific table's row — the carousel only ever
 * needs an `id` (React key / dot target), `alt` text, and an optional
 * `imageUrl`; whether the caller sourced that from `hero_slides` (Phase
 * 11, the real path) or a future different content source doesn't
 * matter to this component. */
type HeroSlideLike = { id: string; alt: string; imageUrl: string | null; ctaHref?: string | null };

const AUTOPLAY_DELAY_MS = 5000;
const SWIPE_THRESHOLD_RATIO = 0.15;
const TRANSITION_MS = 500;

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
  const looping = slideCount > 1;
  // Infinite loop via clones: the track is [clone of last, ...slides, clone
  // of first]. Real slides sit at positions 1..n. Moving past either end
  // slides onto a clone (looks like the neighbouring slide), then — once that
  // transition is over — the track is moved to the matching real slide with
  // no animation. The picture is identical, so the jump is invisible and the
  // slides read as endless back-to-back frames.
  const [position, setPosition] = useState(looping ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffsetPercent, setDragOffsetPercent] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const autoplayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRef = useRef(position);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const deltaXRef = useRef(0);
  // True right after a real swipe, so the click that follows a drag doesn't
  // also follow the slide's link.
  const swipedRef = useRef(false);

  const commitPosition = useCallback((next: number) => {
    positionRef.current = next;
    setPosition(next);
  }, []);

  /** If the track rests on a clone, jump (no animation) to its real twin. */
  const snapIfOnClone = useCallback(() => {
    if (snapTimer.current !== null) {
      clearTimeout(snapTimer.current);
      snapTimer.current = null;
    }
    if (!looping) return;
    const current = positionRef.current;
    if (current === slideCount + 1 || current === 0) {
      setAnimate(false);
      commitPosition(current === 0 ? slideCount : 1);
    }
  }, [commitPosition, looping, slideCount]);

  /** Re-enable the transition one frame after an un-animated jump. */
  useEffect(() => {
    if (animate) return undefined;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [animate]);

  /** Safety net: `transitionend` never fires when the tab is hidden or motion is reduced. */
  useEffect(() => {
    if (!looping || isDragging) return undefined;
    if (position !== 0 && position !== slideCount + 1) return undefined;
    snapTimer.current = setTimeout(snapIfOnClone, TRANSITION_MS + 200);
    return () => {
      if (snapTimer.current !== null) {
        clearTimeout(snapTimer.current);
        snapTimer.current = null;
      }
    };
  }, [isDragging, looping, position, slideCount, snapIfOnClone]);

  const step = useCallback(
    (direction: 1 | -1) => {
      snapIfOnClone();
      const next = positionRef.current + direction;
      // Stay inside the cloned track even if clicks arrive faster than the snap.
      commitPosition(Math.min(Math.max(next, 0), slideCount + 1));
    },
    [commitPosition, slideCount, snapIfOnClone],
  );

  /** Dot click: go straight to a real slide. */
  const goTo = useCallback(
    (index: number) => {
      setAnimate(true);
      commitPosition(index + 1);
    },
    [commitPosition],
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
    autoplayTimer.current = setInterval(() => step(1), AUTOPLAY_DELAY_MS);
  }, [slideCount, step, stopAutoplay]);

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
      swipedRef.current = false;
      // Grabbing the track while it rests on a clone: move to the twin first.
      snapIfOnClone();
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
      swipedRef.current = Math.abs(deltaXRef.current) > 8;
      setIsDragging(false);
      setDragOffsetPercent(0);
      const threshold = wrap.offsetWidth * SWIPE_THRESHOLD_RATIO;
      // RTL track: dragging right pulls in the NEXT slide (from the left).
      if (deltaXRef.current > threshold) {
        step(1);
      } else if (deltaXRef.current < -threshold) {
        step(-1);
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
  }, [slideCount, snapIfOnClone, startAutoplay, step, stopAutoplay]);

  if (slideCount === 0) return null;

  // RTL track: slide 1 sits at the right edge and later slides continue to the
  // LEFT, exactly like the dots below (dot 1 at the right). "Next" therefore
  // pans the view leftwards, i.e. the content moves RIGHT (positive translate).
  const translatePercent = position * 100 + dragOffsetPercent;
  const activeIndex = looping ? (position - 1 + slideCount) % slideCount : 0;
  // Clones are visual only: hidden from assistive tech and the tab order.
  const track = looping
    ? [
        { slide: slides[slideCount - 1]!, key: "clone-last", index: slideCount - 1, clone: true },
        ...slides.map((slide, index) => ({ slide, key: slide.id, index, clone: false })),
        { slide: slides[0]!, key: "clone-first", index: 0, clone: true },
      ]
    : slides.map((slide, index) => ({ slide, key: slide.id, index, clone: false }));

  return (
    <div
      ref={wrapRef}
      id="heroCarousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="بنرهای تبلیغاتی"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
      // Stop the browser's native image drag-and-drop (and text selection),
      // which otherwise hijacks a mouse swipe and drags the picture itself.
      onDragStart={(event) => event.preventDefault()}
      style={{ touchAction: "pan-y" }}
      className="relative aspect-[21/8] w-full cursor-grab select-none overflow-hidden rounded-[22px] bg-gradient-to-br from-[#E7DFD2] to-[#DED4C4] active:cursor-grabbing max-[640px]:aspect-[4/3.4]"
    >
      <div
        style={{
          direction: "rtl",
          transform: `translateX(${translatePercent}%)`,
          transition: isDragging || !animate ? "none" : `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          willChange: "transform",
        }}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget) snapIfOnClone();
        }}
        className="flex h-full w-full"
      >
        {track.map(({ slide, key, index, clone }) => (
          <div
            key={key}
            role="group"
            aria-roledescription="اسلاید"
            aria-hidden={clone || undefined}
            aria-label={`${toPersianDigits(index + 1)} از ${toPersianDigits(slideCount)}`}
            className="relative h-full w-full shrink-0 basis-full"
          >
            {slide.imageUrl ? (
              <Image
                src={slide.imageUrl}
                alt={slide.alt}
                fill
                priority={index === 0 && !clone}
                loading={index === 0 && !clone ? undefined : "eager"}
                sizes="100vw"
                draggable={false}
                className="pointer-events-none object-cover"
              />
            ) : (
              <AssetSlot label={slide.alt} tone="banner" rounded="none" className="h-full w-full" />
            )}
            {safeHref(slide.ctaHref) && (
              <Link
                href={safeHref(slide.ctaHref)!}
                aria-label={slide.alt}
                draggable={false}
                tabIndex={clone ? -1 : undefined}
                onClick={(event) => {
                  if (swipedRef.current) {
                    event.preventDefault();
                    swipedRef.current = false;
                  }
                }}
                className="absolute inset-0 z-[1] cursor-pointer"
              />
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
                  index === activeIndex
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
