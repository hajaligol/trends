"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";

export type PopoverPosition = { top?: number; bottom?: number; left: number; width: number; maxHeight: number; placement: "below" | "above" };

const GAP = 6;
const MARGIN = 8;

/**
 * Positions a `position: fixed` panel next to its trigger, flipping above when
 * there is not enough room below, clamped inside the viewport, and following
 * scroll/resize while open. Fixed positioning means no ancestor with
 * `overflow: hidden` (cards, wizard panels, tables) can clip it.
 *
 * `align="end"` lines the panel's right edge up with the trigger in RTL.
 */
export function usePopoverPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  options: { width?: number | "trigger"; minWidth?: number; desiredHeight: number },
) {
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const { width: widthOption = "trigger", minWidth = 0, desiredHeight } = options;

  const compute = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const width = Math.min(
      Math.max(widthOption === "trigger" ? rect.width : widthOption, minWidth),
      viewportW - MARGIN * 2,
    );
    // RTL: keep the panel's right edge on the trigger's right edge.
    const rtl = getComputedStyle(trigger).direction === "rtl";
    let left = rtl ? rect.right - width : rect.left;
    left = Math.min(Math.max(left, MARGIN), viewportW - width - MARGIN);

    const spaceBelow = viewportH - rect.bottom - GAP - MARGIN;
    const spaceAbove = rect.top - GAP - MARGIN;
    const placeAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(desiredHeight, placeAbove ? spaceAbove : spaceBelow));
    setPosition(
      placeAbove
        ? { bottom: viewportH - rect.top + GAP, left, width, maxHeight, placement: "above" }
        : { top: rect.bottom + GAP, left, width, maxHeight, placement: "below" },
    );
  }, [triggerRef, widthOption, minWidth, desiredHeight]);

  useLayoutEffect(() => {
    if (!open) return;
    compute();
  }, [open, compute]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, compute]);

  return open ? position : null;
}

/** Close on outside pointer-down and on Escape (returning focus to the trigger). */
export function useDismiss(
  open: boolean,
  onClose: () => void,
  refs: RefObject<HTMLElement | null>[],
  returnFocusTo?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        returnFocusTo?.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
    // refs are stable ref objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);
}
