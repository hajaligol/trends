"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

type SwipeRowProps = {
  /** Accessible name for the scrollable region, e.g. the section title. */
  label: string;
  /** Show the previous/next arrow buttons. */
  showArrows: boolean;
  /** Tailwind classes sizing every item (its flex-basis). */
  itemClassName: string;
  /** Tailwind gap classes between items. */
  gapClassName: string;
  /** Eased scroll on arrow clicks and transitions on the arrows. Pass
   * `false` for a row that must have no animation at all. */
  animated?: boolean;
  /** Items are server-rendered by the caller and passed through as
   * children, so only the scrolling behaviour ships as client JS. */
  children: ReactNode;
};

/**
 * Horizontally swipeable row: native overflow scrolling with scroll-snap
 * (touch swipe, trackpad, mouse wheel and keyboard focus all work without
 * JS), plus optional arrow buttons for mouse users.
 *
 * RTL: the row starts at the right edge and "next" scrolls towards the
 * left. Browsers report `scrollLeft` as 0 → negative in RTL, so positions
 * use `Math.abs(scrollLeft)` and the scroll direction is read from the
 * computed `direction` instead of being assumed.
 */
export function SwipeRow({ label, showArrows, itemClassName, gapClassName, animated = true, children }: SwipeRowProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canGoPrev, setCanGoPrev] = useState(false);
  const [canGoNext, setCanGoNext] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const position = Math.abs(el.scrollLeft);
    setCanGoPrev(position > 1);
    setCanGoNext(position + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    if (!showArrows) return;
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [showArrows, updateEdges]);

  // Mouse drag-to-scroll. Touch already scrolls natively; a mouse can't,
  // so without this the arrows would be the only way to move a row.
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  function onPointerDown(event: PointerEvent<HTMLUListElement>) {
    const el = scrollerRef.current;
    if (!el || event.pointerType !== "mouse" || event.button !== 0) return;
    if (el.scrollWidth <= el.clientWidth) return;
    drag.current = { active: true, startX: event.clientX, startScroll: el.scrollLeft, moved: false };
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    function onMove(event: globalThis.PointerEvent) {
      const state = drag.current;
      if (!state.active || !el) return;
      const delta = event.clientX - state.startX;
      if (!state.moved && Math.abs(delta) > 5) {
        state.moved = true;
        el.style.scrollSnapType = "none"; // let the drag move freely
        el.style.cursor = "grabbing";
      }
      if (state.moved) el.scrollLeft = state.startScroll - delta;
    }

    function onUp() {
      const state = drag.current;
      if (!state.active || !el) return;
      state.active = false;
      el.style.scrollSnapType = ""; // snaps back to the nearest card
      el.style.cursor = "";
    }

    // A drag must not end in a click on the product link under the cursor.
    function onClickCapture(event: MouseEvent) {
      if (drag.current.moved) {
        event.preventDefault();
        event.stopPropagation();
        drag.current.moved = false;
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  // Eased, snap-aligned arrow scrolling. Native `behavior: "smooth"` fights
  // `scroll-snap-type: mandatory` in several browsers (jerky or cut short),
  // so the animation is driven manually with snap switched off meanwhile.
  const animation = useRef<number | null>(null);

  const cancelAnimation = useCallback(() => {
    if (animation.current !== null) {
      cancelAnimationFrame(animation.current);
      animation.current = null;
      const el = scrollerRef.current;
      if (el) el.style.scrollSnapType = "";
    }
  }, []);

  useEffect(() => cancelAnimation, [cancelAnimation]);

  function scrollByPage(direction: "prev" | "next") {
    const el = scrollerRef.current;
    if (!el) return;
    cancelAnimation();

    const isRtl = getComputedStyle(el).direction === "rtl";
    const forward = direction === "next" ? 1 : -1;
    // `delta` below is already signed by `forward` (negative = back), so only
    // the RTL flip of scrollLeft's axis is applied to it here.
    const axis = isRtl ? -1 : 1;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Distance (along the reading direction) of each item's start edge from
    // the scroller's start edge, minus the 8px inline padding.
    const box = el.getBoundingClientRect();
    const offsets = Array.from(el.children).map((child) => {
      const r = (child as HTMLElement).getBoundingClientRect();
      return (isRtl ? box.right - r.right : r.left - box.left) - 8;
    });
    const wanted = forward * el.clientWidth * 0.85;
    const candidates = offsets.filter((d) => (forward > 0 ? d > 1 : d < -1));
    let delta = wanted;
    if (candidates.length > 0) {
      delta = candidates.reduce((best, d) => (Math.abs(d - wanted) < Math.abs(best - wanted) ? d : best));
    }

    const max = el.scrollWidth - el.clientWidth;
    const from = el.scrollLeft;
    const rawTarget = from + axis * delta;
    const target = isRtl ? Math.max(-max, Math.min(0, rawTarget)) : Math.max(0, Math.min(max, rawTarget));
    if (Math.abs(target - from) < 1) return;

    if (reduceMotion || !animated) {
      el.scrollLeft = target;
      return;
    }

    const duration = Math.min(700, 380 + Math.abs(target - from) * 0.25);
    const startTime = performance.now();
    el.style.scrollSnapType = "none";

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
      el.scrollLeft = from + (target - from) * eased;
      if (t < 1) {
        animation.current = requestAnimationFrame(step);
      } else {
        animation.current = null;
        el.style.scrollSnapType = "";
      }
    };
    animation.current = requestAnimationFrame(step);
  }

  const arrowClass =
    `absolute top-[34%] z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_-6px_rgba(24,38,48,0.45)] ring-1 ring-ink/10 ${animated ? "transition duration-200" : ""} hover:bg-brand hover:text-white sm:flex lg:h-11 lg:w-11`;

  // The scroller has 8px of inline padding (cancelled by -mx-2, so item
  // positions don't move). Without it the first/last item sits exactly on
  // the clip edge and browsers' sub-pixel rounding shaves up to ~1px off
  // its border, rounded corners and ring/shadow.
  return (
    <div className="relative">
      <ul
        ref={scrollerRef}
        onScroll={showArrows ? updateEdges : undefined}
        onPointerDown={(event) => {
          cancelAnimation();
          onPointerDown(event);
        }}
        onWheel={cancelAnimation}
        onTouchStart={cancelAnimation}
        onDragStart={(event) => event.preventDefault()}
        aria-label={label}
        className={`-mx-2 -my-4 flex snap-x snap-mandatory scroll-px-2 overflow-x-auto overscroll-x-contain px-2 py-4 md:cursor-grab [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${gapClassName}`}
      >
        {Children.toArray(children).map((child) => (
          <li
            key={isValidElement(child) && child.key !== null ? child.key : undefined}
            className={`flex shrink-0 snap-start [&>*]:w-full ${itemClassName}`}
          >
            {child}
          </li>
        ))}
      </ul>

      {showArrows && canGoPrev && (
        <button
          type="button"
          onClick={() => scrollByPage("prev")}
          aria-label="قبلی"
          className={`${arrowClass} -start-3`}
        >
          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      {showArrows && canGoNext && (
        <button
          type="button"
          onClick={() => scrollByPage("next")}
          aria-label="بعدی"
          className={`${arrowClass} -end-3`}
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
