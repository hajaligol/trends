"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, XIcon, ZoomInIcon, ZoomOutIcon } from "@/components/ui/icons";
import { useDialogA11y } from "@/lib/hooks/useDialogA11y";
import { MAX_SCALE, MIN_SCALE, ZOOM_STEP, clampOffset, clampScale, wrapIndex, zoomAt, type Point } from "@/lib/utils/image-zoom";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { ColoredImage } from "@/domains/catalog/gallery";

type View = { scale: number; offset: Point };
const RESET: View = { scale: MIN_SCALE, offset: { x: 0, y: 0 } };
const TAP_SLOP_PX = 6;
const SWIPE_MIN_PX = 60;
const TAP_ZOOM_SCALE = 2.5;

/**
 * Full-screen product image viewer: zoom (buttons, +/- keys, mouse wheel,
 * pinch, tap/click), pan by dragging while zoomed, and navigation across
 * every image of the selected colour (arrows, thumbnails, ←/→ keys, swipe).
 *
 * RTL: "next" is on the visual left (matching the hero carousel and the
 * product page), so ArrowLeft = next, ArrowRight = previous, and a rightward
 * swipe reveals the next image. Buttons use logical `start`/`end` offsets.
 *
 * Dialog semantics, focus trap, Escape and focus restore come from
 * `useDialogA11y`. Mounted only while open (and code-split by the gallery),
 * so it costs nothing until the shopper clicks an image.
 */
export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: ColoredImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  useDialogA11y(true, onClose, panelRef, closeRef);

  const [view, setViewState] = useState<View>(RESET);
  const [dragging, setDragging] = useState(false);
  // Mirror of `view` for event handlers; updated together with the state (in
  // `setView`) so rapid wheel/pointer events never read a stale value.
  const viewRef = useRef<View>(RESET);
  const setView = useCallback((next: View) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  const count = images.length;
  const active = images[wrapIndex(index, count)];

  const stageSize = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }, []);

  /** Pointer position relative to the stage centre (the transform origin). */
  const toAnchor = useCallback((clientX: number, clientY: number): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - (rect.left + rect.width / 2), y: clientY - (rect.top + rect.height / 2) };
  }, []);

  const zoomTo = useCallback(
    (nextScale: number, anchor: Point = { x: 0, y: 0 }) => {
      setView(zoomAt(viewRef.current, nextScale, anchor, stageSize()));
    },
    [stageSize, setView],
  );

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setView(RESET);
      onIndexChange(wrapIndex(index + delta, count));
    },
    [count, index, onIndexChange, setView],
  );

  // Lock page scroll behind the dialog.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Keyboard: arrows navigate (RTL), +/-/0 zoom. Escape/Tab: useDialogA11y.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "ArrowLeft") go(1);
      else if (event.key === "ArrowRight") go(-1);
      else if (event.key === "+" || event.key === "=") zoomTo(viewRef.current.scale + ZOOM_STEP);
      else if (event.key === "-" || event.key === "_") zoomTo(viewRef.current.scale - ZOOM_STEP);
      else if (event.key === "0") setView(RESET);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [go, zoomTo, setView]);

  // Mouse wheel / trackpad zoom around the cursor. Needs a non-passive
  // listener so the page behind never scrolls.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.002);
      zoomTo(viewRef.current.scale * factor, toAnchor(event.clientX, event.clientY));
    }
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomTo, toAnchor]);

  // ---- Pointer gestures: pan, pinch, tap-to-zoom, swipe-to-navigate ----
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef({
    start: { x: 0, y: 0 },
    startOffset: { x: 0, y: 0 },
    moved: 0,
    pinchDistance: 0,
    pinchScale: 1,
    wasPinch: false,
  });

  function distanceBetweenPointers() {
    const [a, b] = Array.from(pointers.current.values());
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    if (pointers.current.size === 1) {
      g.start = { x: event.clientX, y: event.clientY };
      g.startOffset = viewRef.current.offset;
      g.moved = 0;
      g.wasPinch = false;
    } else if (pointers.current.size === 2) {
      g.pinchDistance = distanceBetweenPointers();
      g.pinchScale = viewRef.current.scale;
      g.wasPinch = true;
    }
    setDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;

    if (pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      if (!a || !b || g.pinchDistance === 0) return;
      const mid = toAnchor((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomTo(g.pinchScale * (distanceBetweenPointers() / g.pinchDistance), mid);
      return;
    }

    const dx = event.clientX - g.start.x;
    const dy = event.clientY - g.start.y;
    g.moved = Math.max(g.moved, Math.hypot(dx, dy));
    if (viewRef.current.scale > MIN_SCALE) {
      setView({
        scale: viewRef.current.scale,
        offset: clampOffset(
          { x: g.startOffset.x + dx, y: g.startOffset.y + dy },
          viewRef.current.scale,
          stageSize(),
        ),
      });
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) {
      // One finger left after a pinch: continue panning from here.
      const [rest] = Array.from(pointers.current.values());
      if (rest) {
        g.start = rest;
        g.startOffset = viewRef.current.offset;
      }
      return;
    }
    setDragging(false);
    if (cancelled || g.wasPinch) return;

    const dx = event.clientX - g.start.x;
    const dy = event.clientY - g.start.y;
    if (g.moved < TAP_SLOP_PX) {
      // A tap/click toggles zoom at that point.
      if (viewRef.current.scale > MIN_SCALE) setView(RESET);
      else zoomTo(TAP_ZOOM_SCALE, toAnchor(event.clientX, event.clientY));
    } else if (viewRef.current.scale === MIN_SCALE && Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx > 0 ? 1 : -1); // RTL: swipe rightward → next
    }
  }

  if (!active) return null;
  const { scale, offset } = view;
  const percent = toPersianDigits(Math.round(scale * 100));
  const controlClass =
    "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-white/12 text-white transition-colors hover:bg-white/25 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white/12";

  return (
    <div className="fixed inset-0 z-[120]">
      <div aria-hidden="true" className="modal-backdrop-in absolute inset-0 bg-ink/95" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="نمایش بزرگ تصویر محصول"
        className="modal-panel-in absolute inset-0 flex flex-col text-white"
      >
        <div className="relative z-10 flex items-center justify-between gap-3 p-3 sm:p-4">
          <p aria-live="polite" className="m-0 rounded-full bg-white/12 px-3.5 py-1.5 text-[0.85rem]">
            {toPersianDigits(wrapIndex(index, count) + 1)} از {toPersianDigits(count)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="کوچک‌نمایی"
              disabled={scale <= MIN_SCALE}
              onClick={() => zoomTo(scale - ZOOM_STEP)}
              className={controlClass}
            >
              <ZoomOutIcon className="h-[22px] w-[22px]" />
            </button>
            <button
              type="button"
              aria-label="بازگشت به اندازه اصلی"
              disabled={scale === MIN_SCALE}
              onClick={() => setView(RESET)}
              className="h-11 min-w-14 cursor-pointer rounded-full border-0 bg-white/12 px-3 text-[0.85rem] text-white transition-colors hover:bg-white/25 disabled:cursor-default disabled:hover:bg-white/12"
            >
              {percent}٪
            </button>
            <button
              type="button"
              aria-label="بزرگ‌نمایی"
              disabled={scale >= MAX_SCALE}
              onClick={() => zoomTo(scale + ZOOM_STEP)}
              className={controlClass}
            >
              <ZoomInIcon className="h-[22px] w-[22px]" />
            </button>
            <button ref={closeRef} type="button" aria-label="بستن" onClick={onClose} className={`${controlClass} ms-2`}>
              <XIcon className="h-[22px] w-[22px]" />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(event) => endPointer(event, false)}
            onPointerCancel={(event) => endPointer(event, true)}
            style={{ touchAction: "none" }}
            className={`absolute inset-0 overflow-hidden select-none ${
              scale > MIN_SCALE ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
            }`}
          >
            <div
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
              className={`absolute inset-0 ${dragging ? "" : "transition-transform duration-150 ease-out motion-reduce:transition-none"}`}
            >
              <Image
                key={active.url}
                src={active.url}
                alt={active.altText}
                fill
                sizes="200vw"
                draggable={false}
                priority
                className="pointer-events-none object-contain p-2 sm:p-6"
              />
            </div>
          </div>

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="تصویر قبلی"
                onClick={() => go(-1)}
                className={`${controlClass} absolute start-2 top-1/2 z-10 -translate-y-1/2 sm:start-4`}
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="تصویر بعدی"
                onClick={() => go(1)}
                className={`${controlClass} absolute end-2 top-1/2 z-10 -translate-y-1/2 sm:end-4`}
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        {count > 1 && (
          <div className="relative z-10 flex justify-center gap-2.5 overflow-x-auto p-3 sm:p-4">
            {images.map((image, i) => (
              <button
                key={image.url}
                type="button"
                aria-label={`تصویر ${toPersianDigits(i + 1)}`}
                aria-current={i === wrapIndex(index, count)}
                onClick={() => {
                  setView(RESET);
                  onIndexChange(i);
                }}
                className={`relative h-[68px] w-[54px] shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border-2 bg-card-image p-0 transition-[border-color,opacity] duration-200 ${
                  i === wrapIndex(index, count) ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={image.url} alt="" fill sizes="54px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
