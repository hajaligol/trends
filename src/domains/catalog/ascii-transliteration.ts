import { toLatinDigits } from "@/lib/utils/digits";

/**
 * Persian → lowercase-ASCII transliteration (`^[a-z0-9]+(-[a-z0-9]+)*$`).
 *
 * This is NOT used for URLs any more — product slugs are Persian (see
 * `slug.ts`). It exists for places that must stay ASCII, namely variant
 * SKUs (`sku.ts`), and its output is deliberately frozen: changing it
 * would change how future SKUs are built relative to the existing ones.
 * A known fashion word maps to an English word
 * («پیراهن» → `shirt`); anything else is transliterated letter by letter.
 */

const WORD_DICTIONARY: Record<string, string> = {
  پیراهن: "shirt",
  پیرهن: "shirt",
  تیشرت: "tshirt",
  تیشرت‌: "tshirt",
  "تی‌شرت": "tshirt",
  پولو: "polo",
  پولوشرت: "polo-shirt",
  بلوز: "blouse",
  هودی: "hoodie",
  سویشرت: "sweatshirt",
  بافت: "knit",
  پلیور: "sweater",
  ژاکت: "cardigan",
  کت: "jacket",
  کاپشن: "jacket",
  پافر: "puffer",
  پالتو: "coat",
  بارانی: "raincoat",
  جلیقه: "vest",
  شلوار: "pants",
  شلوارک: "shorts",
  جین: "jeans",
  دامن: "skirt",
  مانتو: "manteau",
  مانتویی: "manteau",
  شال: "scarf",
  روسری: "scarf",
  کفش: "shoes",
  کتانی: "sneakers",
  کتونی: "sneakers",
  صندل: "sandals",
  بوت: "boots",
  نیم‌بوت: "ankle-boots",
  کیف: "bag",
  کوله: "backpack",
  کوله‌پشتی: "backpack",
  کمربند: "belt",
  کلاه: "hat",
  کپ: "cap",
  عینک: "glasses",
  آفتابی: "sunglasses",
  ساعت: "watch",
  جوراب: "socks",
  دستکش: "gloves",
  مردانه: "men",
  مردان: "men",
  زنانه: "women",
  زنان: "women",
  بچگانه: "kids",
  بچه: "kids",
  دخترانه: "girls",
  پسرانه: "boys",
  کلاسیک: "classic",
  مینیمال: "minimal",
  ساده: "basic",
  روزانه: "daily",
  اسپرت: "sport",
  رسمی: "formal",
  راحتی: "casual",
  چرم: "leather",
  چرمی: "leather",
  پنبه: "cotton",
  پنبه‌ای: "cotton",
  کتان: "linen",
  پارچه‌ای: "fabric",
  پشمی: "wool",
  ترنج: "toranj",
  زمستانه: "winter",
  تابستانه: "summer",
  بهاره: "spring",
  پاییزه: "autumn",
};

const LETTERS: Record<string, string> = {
  ا: "a", آ: "a", أ: "a", إ: "e", ب: "b", پ: "p", ت: "t", ث: "s", ج: "j", چ: "ch",
  ح: "h", خ: "kh", د: "d", ذ: "z", ر: "r", ز: "z", ژ: "zh", س: "s", ش: "sh",
  ص: "s", ض: "z", ط: "t", ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "gh", ک: "k",
  ك: "k", گ: "g", ل: "l", م: "m", ن: "n", و: "v", ه: "h", ة: "h", ی: "y",
  ي: "y", ئ: "y", ؤ: "v", ء: "", "ٔ": "",
};

/** Letter-by-letter Persian → ASCII (vowels are not written in Persian, so
 * the result is a consonant skeleton — fine for a URL, not for reading). */
function transliterateWord(word: string): string {
  let out = "";
  for (const char of word) out += LETTERS[char] ?? char;
  return out;
}

/** Splits on spaces, ZWNJ (U+200C) kept inside dictionary lookups first. */
function wordsOf(title: string): string[] {
  return toLatinDigits(title)
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // harakat + tatweel
    .split(/[\s\-_/\\.,،؛:()[\]{}"'«»!؟?|+]+/)
    .filter(Boolean);
}

const MAX_ASCII_LENGTH = 100;

/**
 * Turns a title into a valid slug, or `""` if nothing usable remains
 * (e.g. a title made only of symbols) — callers then fall back to a
 * code-based slug.
 */
export function asciiSlugify(title: string): string {
  const parts: string[] = [];
  for (const word of wordsOf(title)) {
    const known = WORD_DICTIONARY[word] ?? WORD_DICTIONARY[word.replace(/\u200c/g, "")];
    const piece = (known ?? transliterateWord(word))
      .toLowerCase()
      .replace(/\u200c/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (piece) parts.push(piece);
  }

  let slug = parts.join("-");
  if (slug.length > MAX_ASCII_LENGTH) {
    slug = slug.slice(0, MAX_ASCII_LENGTH).replace(/-[^-]*$/, "");
    if (!slug) slug = parts.join("-").slice(0, MAX_ASCII_LENGTH);
  }
  return slug.replace(/^-+|-+$/g, "");
}
