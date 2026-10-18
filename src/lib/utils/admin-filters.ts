import { tehranDayEndExclusive, tehranDayStart } from "@/lib/utils/tehran-time";

/**
 * Helpers shared by the admin list filters. Pure (no DB, no React) so they
 * can be unit-tested and reused by both the query layer and the pages.
 */

export type RawParam = string | string[] | undefined;

/** Next gives `string | string[]` for a repeated key; the first value wins. */
export function firstParam(value: RawParam): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;
  return single === undefined ? undefined : single;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/**
 * Makes what an operator typed comparable with what is stored: Persian and
 * Arabic digits become ASCII (codes, SKUs and mobiles are stored in ASCII),
 * Arabic ي/ك become Persian ی/ک, whitespace collapses, length is capped.
 * Returns `undefined` for an empty result so callers can skip the clause.
 */
export function normalizeSearchText(value: RawParam, maxLength = 100): string | undefined {
  const raw = firstParam(value);
  if (!raw) return undefined;
  const text = raw
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  return text === "" ? undefined : text;
}

/** Escapes `%`, `_` and `\` so user text is matched literally by LIKE/ILIKE. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** `%text%` pattern for a literal, case-insensitive "contains" match. */
export function containsPattern(value: string): string {
  return `%${escapeLike(value)}%`;
}

/**
 * A mobile typed as `0912…`, `912…`, `+98912…` or `98912…` reduced to the
 * national digits so it matches the stored `+98912…` by substring. Returns
 * `undefined` when the text isn't (part of) a phone number.
 */
export function mobileSearchDigits(normalized: string): string | undefined {
  if (!/^\+?\d{3,}$/.test(normalized)) return undefined;
  let digits = normalized.replace(/^\+/, "");
  if (digits.startsWith("98")) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");
  return digits.length >= 3 ? digits : undefined;
}

/** Whole-case-insensitive plain "contains" for in-memory filtering. */
export function textIncludes(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().normalize("NFC").includes(needle.toLowerCase().normalize("NFC"));
}

export type DateRangeParams = { from?: string; to?: string };

/** Valid `YYYY-MM-DD` strings only; anything else is dropped. */
export function sanitizeDateRange(from: RawParam, to: RawParam): DateRangeParams {
  const f = firstParam(from);
  const t = firstParam(to);
  return {
    from: tehranDayStart(f) ? f : undefined,
    to: tehranDayStart(t) ? t : undefined,
  };
}

/**
 * Inclusive Tehran-day range → `[start, endExclusive)` instants for a
 * `>= start AND < endExclusive` comparison. A reversed range (from > to) is
 * swapped rather than silently returning nothing.
 */
export function dateRangeBounds(range: DateRangeParams): { start?: Date; endExclusive?: Date } {
  let { from, to } = range;
  if (from && to && from > to) [from, to] = [to, from];
  return {
    start: tehranDayStart(from) ?? undefined,
    endExclusive: tehranDayEndExclusive(to) ?? undefined,
  };
}
