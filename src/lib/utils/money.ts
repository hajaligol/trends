import { toPersianDigits } from "./persian-digits";

/**
 * Formats an integer Toman amount for display, e.g. `590000` ->
 * "۵۹۰,۰۰۰ تومان". Presentation-only — per TRENDS_PROJECT_CONTEXT.md §5
 * ("Money"), every other layer of the app stores/compares plain integer
 * Toman values, never this formatted string.
 */
export function formatToman(amountToman: number): string {
  const withSeparators = Math.round(amountToman).toLocaleString("en-US");
  return `${toPersianDigits(withSeparators)} تومان`;
}

/**
 * Rounded discount percentage for a "compare at" vs. active price, e.g.
 * `(1000000, 750000)` -> `25`. Returns `0` (meaning "no discount to show")
 * when there's nothing to display: no compare-at price, or the compare-at
 * price isn't actually higher than the current price.
 */
export function discountPercent(
  compareAtToman: number | null,
  priceToman: number,
): number {
  if (compareAtToman === null || compareAtToman <= priceToman || compareAtToman <= 0) {
    return 0;
  }
  return Math.round(((compareAtToman - priceToman) / compareAtToman) * 100);
}
