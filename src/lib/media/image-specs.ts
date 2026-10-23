/**
 * Recommended dimensions for every admin image slot, so the hint text shown
 * next to each uploader and the preview tile can never drift apart.
 * The ratios mirror how the storefront actually crops each image
 * (`object-cover` inside the aspect-ratio boxes listed per kind).
 */
export const IMAGE_SPECS = {
  /** ProductCardMedia / ProductGallery use `aspect-[4/5]`. */
  product: { ratio: "4:5", width: 4, height: 5, label: "عمودی", example: "۱۰۸۰×۱۳۵۰" },
  /** HeroCarousel: `aspect-[21/8]` on desktop (4:3.4 on phones, centre-cropped). */
  hero: { ratio: "21:8", width: 21, height: 8, label: "بسیار عریض", example: "۲۱۰۰×۸۰۰" },
  /** PromoBanners: `aspect-[2.2/1]` on desktop (16:9 on phones, centre-cropped). */
  banner: { ratio: "11:5", width: 11, height: 5, label: "عریض", example: "۱۶۵۰×۷۵۰" },
  /** `/sale/<slug>` hero when it is an image: fixed `aspect-[3/1]` box, same on every screen. */
  saleHero: { ratio: "3:1", width: 3, height: 1, label: "بسیار عریض", example: "۱۸۰۰×۶۰۰" },
  /** CategoryTiles circles. */
  square: { ratio: "1:1", width: 1, height: 1, label: "مربع", example: "۸۰۰×۸۰۰" },
  /** Brand logo in the header menu. */
  logo: { ratio: "1:1", width: 1, height: 1, label: "مربع", example: "۵۱۲×۵۱۲" },
  /** BlogCard covers: `aspect-[16/10]`. */
  blogCover: { ratio: "16:10", width: 16, height: 10, label: "افقی", example: "۱۶۰۰×۱۰۰۰" },
  /** Images inside article text keep their own proportions. */
  blogInline: { ratio: "free", width: 4, height: 3, label: "آزاد", example: "" },
} as const;

export type ImageSpecKind = keyof typeof IMAGE_SPECS;

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const faDigits = (value: string) => value.replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d);

/** e.g. «نسبت پیشنهادی: ۴ به ۵ (عمودی) — مثلاً ۱۰۸۰×۱۳۵۰ پیکسل» */
export function imageSpecHint(kind: ImageSpecKind): string {
  const spec = IMAGE_SPECS[kind];
  if (spec.ratio === "free") {
    return "هر نسبتی مجاز است؛ تصویر با همان نسبت اصلی در متن نمایش داده می‌شود.";
  }
  const [w = "", h = ""] = spec.ratio.split(":");
  return `نسبت پیشنهادی: ${faDigits(w)} به ${faDigits(h)} (${spec.label}) — مثلاً ${spec.example} پیکسل`;
}
