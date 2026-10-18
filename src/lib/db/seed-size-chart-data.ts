/**
 * Demo sizing tables for the seeded catalog — pure data/logic, no database
 * or framework imports (so unit tests can run it without a DB).
 *
 * `buildSeedSizeChart` returns a table for any product from its category
 * (audience / group / type key, i.e. the parts of a slug like
 * `men-clothing-t-shirts`) and the sizes its variants actually have, so the
 * first column always matches the product's real size choices. Measurements
 * are plausible demo values, derived deterministically from the size's
 * position in the list; the admin edits them per product afterwards.
 *
 * Every combination yields a table (unknown types fall back to a generic
 * one), so every seeded product gets a sizing table.
 */
import type { SizeChart } from "@/domains/catalog/size-chart";

export type SeedAudience = "men" | "women" | "kids";
export type SeedGroup = "clothing" | "shoes" | "bags" | "accessories";

export type SeedChartInput = { audience: SeedAudience; group: SeedGroup; typeKey: string; sizes: string[] };

const SLUG_RE = /^(men|women|kids)-(clothing|shoes|bags|accessories)-(.+)$/;

/** Splits a type-category slug like `men-clothing-t-shirts`; null for anything else. */
export function parseTypeSlug(slug: string): { audience: SeedAudience; group: SeedGroup; typeKey: string } | null {
  const match = SLUG_RE.exec(slug);
  if (!match) return null;
  return { audience: match[1] as SeedAudience, group: match[2] as SeedGroup, typeKey: match[3]! };
}

const range = (start: number, width: number) => `${start}–${start + width}`;
const num = (value: number) => String(Math.round(value * 10) / 10).replace(".", "٫");
const CM_NOTE = "همه‌ی اندازه‌ها بر حسب سانتی‌متر است و ممکن است تا ۲ سانتی‌متر اختلاف دوخت وجود داشته باشد.";
const BETWEEN_NOTE = " اگر بین دو سایز بودید، سایز بزرگ‌تر را انتخاب کنید.";

const TOP_LENGTH: Record<string, [men: number, women: number]> = {
  shirts: [76, 66], "t-shirts": [70, 60], "polo-shirts": [70, 62], sweatshirts: [68, 62], hoodies: [68, 62],
  sweaters: [68, 62], jackets: [68, 62], puffers: [72, 68], coats: [100, 95], blazers: [74, 66], suits: [74, 66],
  "denim-jackets": [62, 55], vests: [66, 58], raincoats: [90, 88], blouses: [66, 66], tops: [50, 50],
  dresses: [100, 100], "evening-dresses": [120, 120], manteaus: [90, 90], tunics: [80, 80], cardigans: [70, 70],
  "trench-coats": [100, 100], jumpsuits: [140, 140], tracksuits: [68, 62], activewear: [66, 60],
  sleepwear: [70, 70], "prayer-wear": [110, 110],
};
const SHORT_SLEEVE = new Set(["t-shirts", "polo-shirts", "tops"]);
const NO_SLEEVE = new Set(["vests", "dresses", "evening-dresses", "jumpsuits", "dresses-skirts"]);
const LONG_KIDS = new Set(["coats", "puffers", "raincoats", "dresses-skirts", "overalls", "sets", "baby-wear"]);

const BOTTOM_TYPES = new Set(["pants", "chinos", "jeans", "cargo-pants", "sweatpants", "shorts", "leggings", "skirts"]);
const BOTTOM_LENGTH: Record<string, [men: number, women: number]> = {
  pants: [104, 100], chinos: [104, 100], jeans: [104, 100], "cargo-pants": [106, 100], sweatpants: [102, 98],
  shorts: [48, 42], leggings: [96, 94], skirts: [60, 60],
};

function clothing({ audience, typeKey, sizes }: SeedChartInput): SizeChart {
  const kids = audience === "kids";
  const w = audience === "women" ? 1 : 0;

  if (typeKey === "socks") {
    const start = kids ? 24 : audience === "women" ? 35 : 39;
    return {
      columns: ["سایز", "سایز کفش (اروپا)"],
      rows: sizes.map((size, i) => [size, range(start + 3 * i, 2)]),
      note: "سایز جوراب را بر اساس سایز کفش خود انتخاب کنید.",
    };
  }

  if (typeKey === "underwear") {
    return kids
      ? { columns: ["سایز", "قد کودک", "دور کمر"], rows: sizes.map((s, i) => [s, range(100 + 12 * i, 6), range(50 + 2 * i, 2)]), note: CM_NOTE }
      : { columns: ["سایز", "دور کمر"], rows: sizes.map((s, i) => [s, range((w ? 62 : 74) + 4 * i, 4)]), note: CM_NOTE + BETWEEN_NOTE };
  }

  if (BOTTOM_TYPES.has(typeKey)) {
    const length = BOTTOM_LENGTH[typeKey]!;
    if (kids) {
      return {
        columns: ["سایز", "قد کودک", "دور کمر", "طول شلوار"],
        rows: sizes.map((s, i) => [s, range(100 + 12 * i, 6), range(50 + 2 * i, 2), num((typeKey === "shorts" ? 28 : 56) + 6 * i)]),
        note: CM_NOTE,
      };
    }
    const lengthCol = typeKey === "skirts" ? "طول دامن" : typeKey === "shorts" ? "طول شلوارک" : "طول شلوار";
    return {
      columns: ["سایز", "دور کمر", "دور باسن", lengthCol],
      rows: sizes.map((s, i) => [
        s,
        range((w ? 62 : 74) + 4 * i, 4),
        range((w ? 88 : 94) + 4 * i, 4),
        num(length[w]! + i),
      ]),
      note: CM_NOTE + BETWEEN_NOTE,
    };
  }

  // Tops, outerwear, dresses and everything else worn on the upper body.
  const base = TOP_LENGTH[typeKey] ?? [70, 62];
  if (kids) {
    const longer = LONG_KIDS.has(typeKey) ? 10 : 0;
    return {
      columns: ["سایز", "قد کودک", "دور سینه", "طول لباس"],
      rows: sizes.map((s, i) => [s, range(100 + 12 * i, 6), range(54 + 4 * i, 4), num(36 + longer + 6 * i)]),
      note: CM_NOTE + BETWEEN_NOTE,
    };
  }
  const withSleeve = !NO_SLEEVE.has(typeKey);
  const sleeve = SHORT_SLEEVE.has(typeKey) ? 20 - 2 * w : 62 - 4 * w;
  return {
    columns: ["سایز", "دور سینه (بدن)", "قد لباس", "عرض شانه", ...(withSleeve ? ["طول آستین"] : [])],
    rows: sizes.map((s, i) => [
      s,
      range((w ? 84 : 92) + 4 * i, 4),
      num(base[w]! + 2 * i),
      num((w ? 38 : 44) + 2 * i),
      ...(withSleeve ? [num(sleeve + i)] : []),
    ]),
    note: CM_NOTE + BETWEEN_NOTE,
  };
}

function shoes({ audience, sizes }: SeedChartInput): SizeChart {
  const rows = sizes.map((size) => {
    const eu = Number.parseFloat(size.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
    // Paris-point system: EU size = (foot length in cm + 1.5) × 1.5, rounded to 0.5 cm.
    const length = Number.isFinite(eu) ? Math.round((eu / 1.5 - 1.5) * 2) / 2 : null;
    return [size, length === null ? "—" : num(length)];
  });
  return {
    columns: ["سایز (اروپا)", "طول کف پا (سانتی‌متر)"],
    rows,
    note:
      "برای انتخاب سایز، طول پای خود را از پاشنه تا انگشت بلندتر اندازه بگیرید." +
      (audience === "kids" ? " برای رشد کودک می‌توانید ۰٫۵ تا ۱ سانتی‌متر جا بگذارید." : ""),
  };
}

/** [width, height, depth] in cm. */
const BAG_DIMENSIONS: Record<string, [number, number, number]> = {
  backpacks: [30, 42, 14], "shoulder-bags": [26, 20, 8], briefcases: [40, 30, 10], "laptop-bags": [38, 28, 6],
  wallets: [11, 9, 2], "card-holders": [10, 7, 1], "waist-bags": [25, 14, 7], clutches: [25, 15, 5],
  "sports-bags": [50, 28, 26], "travel-bags": [55, 38, 22], handbags: [28, 22, 12], "tote-bags": [38, 34, 12],
  "cosmetic-bags": [20, 13, 8], "school-bags": [30, 40, 15], "lunch-bags": [22, 18, 12],
};

function bags({ audience, typeKey, sizes }: SeedChartInput): SizeChart {
  const factor = audience === "kids" ? 0.85 : 1;
  const [width, height, depth] = (BAG_DIMENSIONS[typeKey] ?? [28, 22, 10]).map((v) => num(v * factor)) as [string, string, string];
  return {
    columns: ["سایز", "عرض", "ارتفاع", "عمق"],
    rows: sizes.map((s) => [s, width, height, depth]),
    note: "ابعاد بر حسب سانتی‌متر است و ممکن است تا ۱ سانتی‌متر اختلاف داشته باشد.",
  };
}

type Dim = { columns: string[]; values: string[]; note: string };
const MM = "ابعاد بر حسب میلی‌متر است.";
const CM = "ابعاد بر حسب سانتی‌متر است.";

const ACCESSORY_DIMENSIONS: Record<string, Dim> = {
  caps: { columns: ["دور سر"], values: ["۵۵–۶۰"], note: "دور سر را بر حسب سانتی‌متر و بالاتر از ابروها اندازه بگیرید؛ بند پشت کلاه قابل تنظیم است." },
  beanies: { columns: ["دور سر"], values: ["۵۴–۶۰"], note: "دور سر را بر حسب سانتی‌متر اندازه بگیرید؛ کلاه بافت کش‌دار است." },
  hats: { columns: ["دور سر", "عرض لبه"], values: ["۵۶–۶۰", "۷"], note: "اندازه‌ها بر حسب سانتی‌متر است." },
  sunglasses: { columns: ["عرض لنز", "پل بینی", "طول دسته"], values: ["۵۲", "۱۸", "۱۴۰"], note: MM },
  watches: { columns: ["قطر صفحه", "عرض بند", "ضخامت"], values: ["۴۰", "۲۰", "۱۰"], note: MM },
  belts: { columns: ["طول کلی", "عرض"], values: ["۱۱۰", "۳٫۵"], note: "اندازه‌ها بر حسب سانتی‌متر است؛ کمربند دارای چند سوراخ تنظیم است." },
  ties: { columns: ["طول", "عرض"], values: ["۱۴۵", "۷"], note: CM },
  scarves: { columns: ["طول", "عرض"], values: ["۱۸۰", "۳۰"], note: CM },
  "neck-scarves": { columns: ["طول", "عرض"], values: ["۱۷۰", "۳۵"], note: CM },
  rousari: { columns: ["طول", "عرض"], values: ["۱۰۰", "۱۰۰"], note: CM },
  shawls: { columns: ["طول", "عرض"], values: ["۲۰۰", "۷۰"], note: CM },
  maghnaeh: { columns: ["دور صورت", "طول"], values: ["۵۶", "۷۰"], note: CM },
  gloves: { columns: ["دور کف دست", "طول"], values: ["۱۹–۲۱", "۲۴"], note: "دور کف دست را بدون انگشت شست اندازه بگیرید. اندازه‌ها بر حسب سانتی‌متر است." },
  bracelets: { columns: ["طول", "عرض"], values: ["۱۸", "۰٫۸"], note: CM },
  necklaces: { columns: ["طول زنجیر", "طول آویز"], values: ["۴۵", "۲٫۵"], note: CM },
  rings: { columns: ["قطر داخلی", "عرض حلقه"], values: ["۱۷", "۴"], note: MM },
  earrings: { columns: ["طول", "عرض"], values: ["۳٫۵", "۱٫۵"], note: CM },
  cufflinks: { columns: ["قطر"], values: ["۱٫۵"], note: CM },
  brooches: { columns: ["طول", "عرض"], values: ["۴", "۳"], note: CM },
  keychains: { columns: ["طول کلی"], values: ["۱۲"], note: CM },
  "hair-accessories": { columns: ["طول", "عرض"], values: ["۸", "۳"], note: CM },
  jewelry: { columns: ["طول", "عرض"], values: ["۱۸", "۱"], note: CM },
  "baby-accessories": { columns: ["طول", "عرض"], values: ["۱۵", "۱۰"], note: CM },
};

function accessories({ typeKey, sizes }: SeedChartInput): SizeChart {
  const dim = ACCESSORY_DIMENSIONS[typeKey] ?? { columns: ["طول", "عرض"], values: ["۱۵", "۱۰"], note: CM };
  return { columns: ["سایز", ...dim.columns], rows: sizes.map((s) => [s, ...dim.values]), note: dim.note };
}

export function buildSeedSizeChart(input: SeedChartInput): SizeChart {
  const sizes = input.sizes.length > 0 ? input.sizes : ["فری‌سایز"];
  const withSizes = { ...input, sizes };
  switch (input.group) {
    case "clothing":
      return clothing(withSizes);
    case "shoes":
      return shoes(withSizes);
    case "bags":
      return bags(withSizes);
    default:
      return accessories(withSizes);
  }
}
