/**
 * Iranian mobile number normalization.
 *
 * Canonical stored format (documented here the same way
 * `product-variants.ts` documents its money-unit choice, per
 * CLAUDE_BUILD_INSTRUCTIONS.txt Phase 6 task list): **`+98` followed by
 * the 10-digit subscriber number, no spaces/dashes** — e.g.
 * `+989123456789`. This is the E.164 format for Iranian mobiles and is
 * what gets stored in `users.mobile` and compared against on login.
 *
 * Accepted input formats (all normalize to the same canonical value for
 * the same real number), reflecting how people actually type an Iranian
 * mobile number:
 * - `09123456789` (the everyday domestic format)
 * - `9123456789` (domestic without the leading 0)
 * - `+989123456789` / `00989123456789` (already-international)
 * - Persian/Arabic-Indic digits in any of the above (`۰۹۱۲۳۴۵۶۷۸۹`)
 *
 * A valid Iranian mobile subscriber number is 10 digits starting with
 * `9` (e.g. `912...`, `935...`), per Iran's national numbering plan.
 */

const PERSIAN_TO_ASCII_DIGITS: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  // Arabic-Indic (as opposed to Persian) variants some keyboards produce.
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

/** Exported for other numeric-input validation (e.g. postal codes) that
 * needs the same Persian/Arabic-Indic -> ASCII digit normalization
 * without the full mobile-number parsing logic below. */
export function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => PERSIAN_TO_ASCII_DIGITS[char] ?? char);
}

/**
 * Normalizes a user-entered Iranian mobile number to canonical
 * `+98XXXXXXXXXX` form. Returns `null` if the input is not a
 * recognizable Iranian mobile number, rather than throwing — callers
 * (form validation) turn that into a field error.
 */
export function normalizeIranianMobile(input: string): string | null {
  const ascii = toAsciiDigits(input).trim();
  const digitsOnly = ascii.replace(/[^\d+]/g, "");

  let subscriber: string | null = null;

  if (/^\+989\d{9}$/.test(digitsOnly)) {
    subscriber = digitsOnly.slice(3);
  } else if (/^00989\d{9}$/.test(digitsOnly)) {
    subscriber = digitsOnly.slice(4);
  } else if (/^09\d{9}$/.test(digitsOnly)) {
    subscriber = digitsOnly.slice(1);
  } else if (/^9\d{9}$/.test(digitsOnly)) {
    subscriber = digitsOnly;
  }

  if (!subscriber || !/^9\d{9}$/.test(subscriber)) return null;
  return `+98${subscriber}`;
}

/** Presentation-only: `+989123456789` -> `۰۹۱۲ ۳۴۵ ۶۷۸۹`-style spacing
 * would require Persian-digit conversion too; kept deliberately simple
 * (`0912 345 6789`) since most UI call sites already run values through
 * `toPersianDigits` themselves when displaying to the user. */
export function formatIranianMobileForDisplay(canonical: string): string {
  const subscriber = canonical.replace("+98", "0");
  if (subscriber.length !== 11) return canonical;
  return `${subscriber.slice(0, 4)} ${subscriber.slice(4, 7)} ${subscriber.slice(7)}`;
}
