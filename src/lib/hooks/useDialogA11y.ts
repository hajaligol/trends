"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessibility behavior shared by every modal overlay/drawer
 * (`SearchOverlay`, formerly also the cart drawer) — Phase 14's "accessibility pass" and
 * "RTL pass" tasks, and critical flow #12 ("keyboard navigation of
 * dialogs/drawers") from CLAUDE_BUILD_INSTRUCTIONS.txt.
 *
 * On open:
 * - Remembers whatever element had focus (the trigger button in the
 *   header), so it can be restored on close — without this, closing a
 *   dialog with Escape silently drops keyboard focus to `<body>`, and
 *   the next Tab press starts back at the top of the page instead of
 *   continuing where the user was.
 * - Moves focus into the dialog (`initialFocusRef` if given — e.g. the
 *   search input — otherwise the dialog's own first focusable element,
 *   which in practice is its close button).
 *
 * While open:
 * - Traps Tab/Shift+Tab within the dialog's focusable elements, so
 *   keyboard users can never tab "through" the dialog into whatever
 *   storefront content sits behind the backdrop (a real gap in the
 *   original `CartDrawer`, which had a backdrop and Escape-to-close but
 *   nothing stopping Tab from reaching links behind it).
 * - Escape closes it.
 *
 * On close: restores focus to the element remembered on open.
 *
 * Direction-agnostic: Tab/Shift+Tab cycling is a DOM focus-order concern,
 * not a visual-direction one, so this needs no RTL-specific branching —
 * it works the same whether the panel is on the visual left or right.
 */
export function useDialogA11y(
  isOpen: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // Deferred so the panel has finished its open transition/mount
    // before we try to move focus into it.
    const focusTimer = setTimeout(() => {
      const target = initialFocusRef?.current ?? containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      target?.focus();
    }, 30);

    function getFocusable(): HTMLElement[] {
      const container = containerRef.current;
      if (!container) return [];
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !containerRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !containerRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerRef/initialFocusRef are stable refs; re-running only on isOpen/onClose is intentional.
  }, [isOpen, onClose]);
}
