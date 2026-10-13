import { toLatinDigits } from "@/lib/utils/digits";

/**
 * Product slug generation from a (usually Persian) title — pure, no DB, so
 * the admin form can show a live preview with the exact same function the
 * Server Action uses. The server result is the authoritative one.
 *
 * Product slugs keep the title's own words:
 *   «پیراهن کلاسیک مردانه» → `پیراهن-کلاسیک-مردانه`
 *
 * Rules:
 *  - Persian letters are kept; Arabic look-alikes are folded to their
 *    Persian form (ي → ی, ك → ک, ة → ه, أ/إ → ا) so the same title never
 *    produces two different slugs depending on the keyboard used.
 *  - Persian/Arabic-Indic digits become ASCII digits (shorter, and stable
 *    when the URL is percent-encoded).
 *  - Latin letters (brand names such as "Nike") are kept, lowercased.
 *  - Spaces, ZWNJ (نیم‌فاصله) and punctuation become a single `-`.
 *    ZWNJ is turned into a dash rather than kept: it is invisible, easy to
 *    lose when a URL is copied, and «پارچه‌ای» → `پارچه-ای` stays readable.
 *  - Diacritics, tatweel and direction marks are dropped.
 *
 * Category slugs are NOT affected: they stay lowercase ASCII.
 */

/** Characters allowed in a product slug besides `a-z`, `0-9` and `-`. */
const PERSIAN_LETTERS = "آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئؤء";

const SLUG_CHAR = `[a-z0-9${PERSIAN_LETTERS}]`;

/** A valid product slug: runs of allowed characters joined by single dashes. */
export const PRODUCT_SLUG_PATTERN = new RegExp(`^${SLUG_CHAR}+(?:-${SLUG_CHAR}+)*$`);

export const MAX_SLUG_LENGTH = 80;

const ARABIC_FOLDING: Record<string, string> = {
  ي: "ی",
  ى: "ی",
  ك: "ک",
  ة: "ه",
  أ: "ا",
  إ: "ا",
  ٱ: "ا",
  ۀ: "ه",
};

export function isValidProductSlug(value: string): boolean {
  return value.length <= MAX_SLUG_LENGTH * 2 && PRODUCT_SLUG_PATTERN.test(value);
}

/**
 * Turns a title into a valid slug, or `""` if nothing usable remains
 * (e.g. a title made only of symbols) — callers then fall back to a
 * code-based slug.
 */
export function slugifyTitle(title: string): string {
  const folded = toLatinDigits(title)
    // Fold ۀ before NFKC, which would split it into ە + hamza.
    .replace(/ۀ/g, "ه")
    .normalize("NFKC")
    .replace(/[يىكةأإٱ]/g, (char) => ARABIC_FOLDING[char] ?? char)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640\u200e\u200f]/g, ""); // harakat, tatweel, direction marks

  const words = folded
    .replace(new RegExp(`[^a-z0-9${PERSIAN_LETTERS}]+`, "g"), "-") // spaces, ZWNJ, punctuation, anything else
    .split("-")
    .filter(Boolean);

  let slug = words.join("-");
  if (slug.length > MAX_SLUG_LENGTH) {
    // Cut at a word boundary when one exists, otherwise hard-cut.
    const cut = slug.slice(0, MAX_SLUG_LENGTH);
    slug = cut.replace(/-[^-]*$/, "") || cut;
  }
  return slug.replace(/^-+|-+$/g, "");
}

/**
 * The public path of a product page. The slug is percent-encoded so that
 * server-generated absolute URLs (sitemap, canonical, JSON-LD, Open Graph)
 * are valid ASCII URLs; browsers display the Persian form.
 */
export function productHref(slug: string): string {
  return `/product/${encodeURIComponent(slug)}`;
}

/**
 * Normalises a slug that arrived from a URL. Depending on the Next.js
 * version/runtime, a dynamic route param may still be percent-encoded, so
 * decode it (safely — a malformed escape must not throw) and compose it to
 * NFC so it matches what is stored.
 */
export function normalizeSlugParam(raw: string): string {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // Malformed percent-escape: use the raw value; it simply won't match.
  }
  return value.normalize("NFC");
}

/** `base`, then `base-2`, `base-3`, … until `isTaken` says it's free. */
export async function pickAvailableSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await isTaken(base))) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  // Practically unreachable; a random tail keeps the action from failing.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
