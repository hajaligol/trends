/**
 * Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits.
 * Used to normalise typed input (search boxes, product codes) before it is
 * compared with stored values. The reverse direction — display — is
 * `toPersianDigits` in `persian-digits.ts`.
 */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}
