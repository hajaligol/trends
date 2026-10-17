"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * One filter button + its popover panel. Open/close state lives in the filter
 * bar (only one panel open at a time, Escape / outside click close it).
 *
 * Layout: a popover under the button from `lg` up; below that it is anchored to
 * the bar (so it can never run off the screen edge) and on phones it becomes a
 * bottom sheet over a dimmed page.
 */
export function FilterDropdown({
  id,
  label,
  valueLabel,
  activeCount = 0,
  open,
  onToggle,
  onClose,
  children,
}: {
  id: string;
  label: string;
  /** Shown after the label (e.g. the selected sort). */
  valueLabel?: string;
  /** Number of selected values; > 0 highlights the button. */
  activeCount?: number;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  // Move focus into the panel when it opens (keyboard / screen-reader users).
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>("input, button, [href]");
    first?.focus({ preventScroll: true });
  }, [open]);

  const highlighted = activeCount > 0;

  return (
    <div className="lg:relative">
      <button
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={onToggle}
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-[0.88rem] transition-colors ${
          highlighted || open ? "border-ink" : "border-line hover:border-ink"
        } ${highlighted ? "bg-ink text-white" : "bg-white text-ink"}`}
      >
        <span>{label}</span>
        {valueLabel && <span className={highlighted ? "text-white/80" : "text-text-secondary"}>{valueLabel}</span>}
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[0.72rem] font-semibold text-ink">
            {toPersianDigits(activeCount)}
          </span>
        )}
        <ChevronDownIcon aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-30 bg-ink/30 sm:hidden" />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={label}
            className="absolute start-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius-md)] border border-line bg-white p-4 shadow-[0_10px_30px_rgba(24,38,48,0.08)] max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto max-sm:mt-0 max-sm:max-h-[78vh] max-sm:w-auto max-sm:overflow-y-auto"
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

/** Apply / clear row shared by the multi-select and price panels. */
export function PanelActions({
  onApply,
  onClear,
  clearDisabled,
}: {
  onApply: () => void;
  onClear: () => void;
  clearDisabled?: boolean;
}) {
  return (
    <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
      <button
        type="button"
        onClick={onApply}
        className="flex-1 rounded-full bg-ink px-4 py-2 text-[0.88rem] font-semibold text-white hover:opacity-90"
      >
        اعمال فیلتر
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={clearDisabled}
        className="rounded-full border border-line px-4 py-2 text-[0.88rem] text-text-secondary hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        پاک کردن
      </button>
    </div>
  );
}
