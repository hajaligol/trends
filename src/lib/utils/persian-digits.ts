const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/**
 * Converts the ASCII digits of a number/numeric string to Persian
 * (Eastern Arabic-Indic) digits for UI display, per
 * TRENDS_PROJECT_CONTEXT.md §5 ("Use Persian digit formatting in the UI
 * where appropriate"). Presentation-only — never run this on a value
 * before storing or comparing it.
 */
export function toPersianDigits(value: number | string): string {
  // Replace ASCII digits only. (The previous per-character `Number(char)`
  // lookup turned every space into «۰», because `Number(" ")` is 0 — that
  // corrupted spaced values like "0910 908 7279" and formatted dates.)
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]!);
}
