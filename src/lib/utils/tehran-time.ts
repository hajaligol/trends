/**
 * Iran abolished daylight saving in 2022 and is a fixed UTC+03:30, so an
 * operator-typed «datetime-local» value (no zone) can be converted with a
 * constant offset instead of trusting the server's or the browser's zone.
 * Used for campaign start/end so «۰۰:۰۰ اول مهر» means Tehran midnight no
 * matter where the server runs.
 */
const OFFSET_MINUTES = 3 * 60 + 30;
const OFFSET_MS = OFFSET_MINUTES * 60_000;

/** `"2026-10-16T10:00"` (Tehran wall clock) → the matching instant. */
export function tehranInputToDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+03:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** An instant → `"YYYY-MM-DDTHH:mm"` Tehran wall clock, for `<input type="datetime-local">`. */
export function dateToTehranInput(date: Date | null): string {
  if (!date) return "";
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 16);
}
