const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/**
 * Converts the ASCII digits of a number/numeric string to Persian
 * (Eastern Arabic-Indic) digits for UI display, per
 * TRENDS_PROJECT_CONTEXT.md §5 ("Use Persian digit formatting in the UI
 * where appropriate"). Presentation-only — never run this on a value
 * before storing or comparing it.
 */
export function toPersianDigits(value: number | string): string {
  return String(value)
    .split("")
    .map((char) => PERSIAN_DIGITS[Number(char)] ?? char)
    .join("");
}
