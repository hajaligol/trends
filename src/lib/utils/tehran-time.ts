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

const DAY_MS = 24 * 60 * 60_000;

/**
 * `"2026-10-16"` (an `<input type="date">` value, Tehran calendar day) →
 * the instant that day starts in Tehran. `null` for anything that is not a
 * real calendar date (so a hand-edited query string can't reach the query).
 */
export function tehranDayStart(value: string | undefined | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+03:30`);
  if (Number.isNaN(date.getTime())) return null;
  // Reject overflow dates such as 2026-02-31 (Date silently rolls them over).
  if (new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10) !== value) return null;
  return date;
}

/** Exclusive upper bound for an inclusive "to" day: the next Tehran midnight. */
export function tehranDayEndExclusive(value: string | undefined | null): Date | null {
  const start = tehranDayStart(value);
  return start ? new Date(start.getTime() + DAY_MS) : null;
}
