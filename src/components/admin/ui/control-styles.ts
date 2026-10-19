/**
 * Shared control look for every admin input. Lives in its own module (no JSX,
 * no "use client") so both the server-safe `layout.tsx` and the client
 * `combobox.tsx` / `jalali-picker.tsx` can import it without a cycle.
 */
export const CONTROL_BASE =
  "rounded-[var(--radius-md)] border border-line bg-white px-4 py-2.5 text-[0.88rem] text-ink outline-none transition-colors placeholder:text-text-secondary/70 hover:border-ink/25 focus:border-brand focus:outline-2 focus:outline-offset-1 focus:outline-brand/30";

/** Full width (form fields). */
export const CONTROL = `w-full ${CONTROL_BASE}`;

/** Floating panel shared by the dropdown list and the calendar. */
export const POPOVER_PANEL =
  "fixed z-[70] rounded-[var(--radius-lg)] border border-line bg-white shadow-[0_18px_44px_-14px_rgba(24,38,48,0.32)]";
