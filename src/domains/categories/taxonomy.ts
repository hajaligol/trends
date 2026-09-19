/**
 * The canonical Trends category taxonomy — pure data, **no database or
 * framework imports**, so it can be used by the seed script, the
 * non-destructive `db:sync-categories` script, and unit tests alike.
 *
 * Three levels, always:
 *
 *   level 1 — audience   مردانه / زنانه / بچگانه          (`men`, `women`, `kids`)
 *   level 2 — group      لباس / کفش / کیف / اکسسوری + audience
 *                        (`men-clothing`, `men-shoes`, `men-bags`, `men-accessories`)
 *   level 3 — type       پیراهن مردانه, تیشرت مردانه, ...   (`men-clothing-shirts`, ...)
 *
 * **Products are attached to level-3 ("type") categories only** (enforced
 * by the admin product actions). Level-1/2 listing pages show the
 * aggregate of everything beneath them.
 *
 * ### Naming
 * Level-3 names carry the audience word (`پیراهن مردانه`, not just
 * `پیراهن`) on purpose: those names are shown out of context — page
 * `<title>`s, search matches, the admin product picker, breadcrumbs on a
 * product page — where a bare "پیراهن" would be ambiguous between three
 * audiences. It also matches how Iranian stores name their category
 * pages, which is what shoppers actually search for. A few types whose
 * audience is already part of the noun (`لباس نوزاد`) set `plain: true`
 * to skip the suffix.
 *
 * ### Slugs
 * Slugs are globally unique single URL segments
 * (`/category/men-clothing-shirts`), built as
 * `{audience}-{group}-{typeKey}`. Keeping one flat unique slug per
 * category (instead of nested `/men/clothing/shirts` paths) keeps the
 * existing `/category/[slug]` route, the unique index on
 * `categories.slug`, sitemap entries and admin slug validation exactly
 * as they were.
 *
 * Adding a type = add one `[key, label]` line below and run
 * `npm run db:sync-categories` (or re-seed a dev database). Nothing else
 * in the UI needs touching — navigation, category pages, admin pickers
 * and the sitemap all read the tree from the database.
 */

export type AudienceKey = "men" | "women" | "kids";
export type GroupKey = "clothing" | "shoes" | "bags" | "accessories";

/** `[key, label]` or `[key, label, "plain"]` when the label must not get
 * the audience suffix appended. */
type TypeSpec = readonly [key: string, label: string, plain?: "plain"];

export type TaxonomyNode = {
  slug: string;
  name: string;
  /** `null` for the three level-1 audiences. */
  parentSlug: string | null;
  /** 1 = audience, 2 = group, 3 = type. */
  depth: 1 | 2 | 3;
  /** Position among siblings (0-based). */
  displayOrder: number;
  description: string | null;
};

const AUDIENCES: ReadonlyArray<{ key: AudienceKey; name: string; description: string }> = [
  { key: "men", name: "مردانه", description: "لباس، کفش، کیف و اکسسوری مردانه" },
  { key: "women", name: "زنانه", description: "لباس، کفش، کیف و اکسسوری زنانه" },
  { key: "kids", name: "بچگانه", description: "لباس، کفش، کیف و اکسسوری بچگانه" },
];

const GROUPS: ReadonlyArray<{ key: GroupKey; label: string }> = [
  { key: "clothing", label: "لباس" },
  { key: "shoes", label: "کفش" },
  { key: "bags", label: "کیف" },
  { key: "accessories", label: "اکسسوری" },
];

/**
 * Level-3 types per audience and group. Order matters: it is the display
 * order in menus and on category pages, so the most-shopped types come
 * first.
 */
const TYPES: Record<AudienceKey, Record<GroupKey, ReadonlyArray<TypeSpec>>> = {
  men: {
    clothing: [
      ["shirts", "پیراهن"],
      ["t-shirts", "تیشرت"],
      ["polo-shirts", "پولوشرت"],
      ["sweatshirts", "سویشرت"],
      ["hoodies", "هودی"],
      ["sweaters", "پلیور و بافت"],
      ["jackets", "کاپشن"],
      ["puffers", "پافر"],
      ["coats", "پالتو"],
      ["blazers", "کت و بلیزر"],
      ["suits", "کت‌وشلوار"],
      ["denim-jackets", "کت جین"],
      ["vests", "جلیقه"],
      ["raincoats", "بارانی و بادگیر"],
      ["pants", "شلوار پارچه‌ای"],
      ["chinos", "شلوار کتان و چینو"],
      ["jeans", "شلوار جین"],
      ["cargo-pants", "شلوار کارگو"],
      ["sweatpants", "شلوار اسلش"],
      ["shorts", "شلوارک"],
      ["tracksuits", "گرمکن و ست ورزشی"],
      ["activewear", "لباس ورزشی"],
      ["sleepwear", "لباس راحتی و خواب"],
      ["underwear", "لباس زیر"],
      ["socks", "جوراب"],
    ],
    shoes: [
      ["sneakers", "کفش کتانی"],
      ["running-shoes", "کفش ورزشی و رانینگ"],
      ["casual-shoes", "کفش روزمره"],
      ["formal-shoes", "کفش رسمی"],
      ["loafers", "کفش کالج"],
      ["boots", "بوت و نیم‌بوت"],
      ["sandals", "صندل"],
      ["slippers", "دمپایی"],
      ["hiking-shoes", "کفش کوهنوردی"],
      ["football-shoes", "کفش فوتبال و فوتسال"],
    ],
    bags: [
      ["backpacks", "کوله‌پشتی"],
      ["shoulder-bags", "کیف دوشی"],
      ["briefcases", "کیف اداری"],
      ["laptop-bags", "کیف لپ‌تاپ"],
      ["wallets", "کیف پول"],
      ["card-holders", "جاکارتی"],
      ["waist-bags", "کیف کمری"],
      ["clutches", "کیف دستی"],
      ["sports-bags", "ساک ورزشی"],
      ["travel-bags", "چمدان و کیف مسافرتی"],
    ],
    accessories: [
      ["caps", "کلاه کپ"],
      ["beanies", "کلاه بافت"],
      ["hats", "کلاه لبه‌دار"],
      ["sunglasses", "عینک آفتابی"],
      ["watches", "ساعت مچی"],
      ["belts", "کمربند"],
      ["ties", "کراوات و پاپیون"],
      ["scarves", "شال‌گردن و اسکارف"],
      ["gloves", "دستکش"],
      ["bracelets", "دستبند"],
      ["necklaces", "گردنبند"],
      ["rings", "انگشتر"],
      ["cufflinks", "دکمه سردست و گل سینه"],
      ["keychains", "جاکلیدی"],
    ],
  },

  women: {
    clothing: [
      ["blouses", "بلوز و شومیز"],
      ["t-shirts", "تیشرت"],
      ["tops", "تاپ و کراپ‌تاپ"],
      ["dresses", "پیراهن و سارافون"],
      ["evening-dresses", "لباس مجلسی"],
      ["manteaus", "مانتو"],
      ["tunics", "تونیک"],
      ["sweaters", "پلیور و بافت"],
      ["cardigans", "ژاکت و کاردیگان"],
      ["sweatshirts", "سویشرت"],
      ["hoodies", "هودی"],
      ["jackets", "کاپشن"],
      ["puffers", "پافر"],
      ["coats", "پالتو"],
      ["trench-coats", "ترنج و بارانی"],
      ["blazers", "کت و بلیزر"],
      ["denim-jackets", "کت جین"],
      ["vests", "جلیقه"],
      ["pants", "شلوار پارچه‌ای"],
      ["jeans", "شلوار جین"],
      ["leggings", "لگینگ"],
      ["sweatpants", "شلوار اسلش"],
      ["skirts", "دامن"],
      ["shorts", "شلوارک"],
      ["jumpsuits", "سرهمی"],
      ["tracksuits", "گرمکن و ست ورزشی"],
      ["activewear", "لباس ورزشی"],
      ["sleepwear", "لباس راحتی و خواب"],
      ["underwear", "لباس زیر"],
      ["socks", "جوراب و ساق"],
      ["prayer-wear", "لباس نماز و چادر"],
    ],
    shoes: [
      ["sneakers", "کفش کتانی"],
      ["running-shoes", "کفش ورزشی و رانینگ"],
      ["casual-shoes", "کفش روزمره"],
      ["flats", "کفش تخت و بالرین"],
      ["heels", "کفش پاشنه‌دار و مجلسی"],
      ["loafers", "کفش کالج"],
      ["boots", "بوت و نیم‌بوت"],
      ["sandals", "صندل"],
      ["slippers", "دمپایی"],
      ["hiking-shoes", "کفش کوهنوردی"],
    ],
    bags: [
      ["handbags", "کیف دستی"],
      ["shoulder-bags", "کیف دوشی و کراس‌بادی"],
      ["tote-bags", "ساک و توت"],
      ["backpacks", "کوله‌پشتی"],
      ["clutches", "کیف مجلسی و کلاچ"],
      ["wallets", "کیف پول"],
      ["card-holders", "جاکارتی"],
      ["waist-bags", "کیف کمری"],
      ["laptop-bags", "کیف لپ‌تاپ"],
      ["travel-bags", "کیف مسافرتی و ورزشی"],
      ["cosmetic-bags", "کیف لوازم آرایش"],
    ],
    accessories: [
      ["rousari", "روسری"],
      ["shawls", "شال"],
      ["maghnaeh", "مقنعه"],
      ["neck-scarves", "شال‌گردن و اسکارف"],
      ["caps", "کلاه کپ"],
      ["beanies", "کلاه بافت"],
      ["hats", "کلاه لبه‌دار"],
      ["hair-accessories", "اکسسوری مو"],
      ["sunglasses", "عینک آفتابی"],
      ["watches", "ساعت مچی"],
      ["necklaces", "گردنبند"],
      ["earrings", "گوشواره"],
      ["bracelets", "دستبند"],
      ["rings", "انگشتر"],
      ["brooches", "سنجاق سینه"],
      ["belts", "کمربند"],
      ["gloves", "دستکش"],
      ["keychains", "جاکلیدی"],
    ],
  },

  kids: {
    clothing: [
      ["t-shirts", "تیشرت"],
      ["shirts", "پیراهن"],
      ["sweatshirts", "سویشرت"],
      ["hoodies", "هودی"],
      ["sweaters", "پلیور و بافت"],
      ["jackets", "کاپشن"],
      ["puffers", "پافر"],
      ["coats", "پالتو"],
      ["raincoats", "بارانی و بادگیر"],
      ["pants", "شلوار"],
      ["jeans", "شلوار جین"],
      ["shorts", "شلوارک"],
      ["leggings", "لگینگ"],
      ["dresses-skirts", "سارافون و دامن"],
      ["sets", "ست لباس"],
      ["overalls", "سرهمی و اورال"],
      ["baby-wear", "لباس نوزاد", "plain"],
      ["sleepwear", "لباس راحتی و خواب"],
      ["activewear", "لباس ورزشی و گرمکن"],
      ["underwear", "لباس زیر"],
      ["socks", "جوراب"],
    ],
    shoes: [
      ["sneakers", "کفش کتانی"],
      ["sport-shoes", "کفش ورزشی"],
      ["casual-shoes", "کفش روزمره"],
      ["formal-shoes", "کفش رسمی و مجلسی"],
      ["boots", "بوت"],
      ["sandals", "صندل"],
      ["slippers", "دمپایی"],
      ["baby-shoes", "کفش نوزاد", "plain"],
    ],
    bags: [
      ["backpacks", "کوله‌پشتی"],
      ["school-bags", "کیف مدرسه"],
      ["shoulder-bags", "کیف دوشی"],
      ["waist-bags", "کیف کمری"],
      ["wallets", "کیف پول"],
      ["travel-bags", "کیف مسافرتی"],
      ["lunch-bags", "کیف ناهار"],
    ],
    accessories: [
      ["caps", "کلاه کپ"],
      ["beanies", "کلاه بافت"],
      ["hats", "کلاه لبه‌دار و آفتابی"],
      ["sunglasses", "عینک آفتابی"],
      ["scarves", "شال‌گردن و اسکارف"],
      ["gloves", "دستکش"],
      ["hair-accessories", "اکسسوری مو"],
      ["belts", "کمربند"],
      ["watches", "ساعت مچی"],
      ["jewelry", "زیورآلات"],
      ["baby-accessories", "اکسسوری نوزاد", "plain"],
    ],
  },
};

/** Builds the flat, parent-before-child node list from the tables above. */
function buildTaxonomy(): TaxonomyNode[] {
  const nodes: TaxonomyNode[] = [];

  AUDIENCES.forEach((audience, audienceIndex) => {
    nodes.push({
      slug: audience.key,
      name: audience.name,
      parentSlug: null,
      depth: 1,
      displayOrder: audienceIndex,
      description: audience.description,
    });

    GROUPS.forEach((group, groupIndex) => {
      const groupSlug = `${audience.key}-${group.key}`;
      nodes.push({
        slug: groupSlug,
        name: `${group.label} ${audience.name}`,
        parentSlug: audience.key,
        depth: 2,
        displayOrder: groupIndex,
        description: null,
      });

      TYPES[audience.key][group.key].forEach(([key, label, plain], typeIndex) => {
        nodes.push({
          slug: `${groupSlug}-${key}`,
          name: plain ? label : `${label} ${audience.name}`,
          parentSlug: groupSlug,
          depth: 3,
          displayOrder: typeIndex,
          description: null,
        });
      });
    });
  });

  return nodes;
}

/** Every category in the taxonomy, parents always before their children. */
export const CATEGORY_TAXONOMY: ReadonlyArray<TaxonomyNode> = buildTaxonomy();

/** The three level-1 audience slugs, in display order. */
export const ROOT_CATEGORY_SLUGS: ReadonlyArray<AudienceKey> = AUDIENCES.map((audience) => audience.key);

/**
 * Category each Phase-2 demo product is filed under by `npm run db:seed`.
 * Deliberately spread across all three audiences so a freshly seeded
 * store shows the whole navigation working, not just one branch.
 */
export const DEMO_PRODUCT_CATEGORY_SLUG: Readonly<Record<string, string>> = {
  "classic-shirt": "men-clothing-shirts",
  "womens-knit": "women-clothing-sweaters",
  "minimal-sneaker": "men-shoes-sneakers",
  "daily-hoodie": "men-clothing-hoodies",
  "trench-coat": "women-clothing-trench-coats",
  backpack: "men-bags-backpacks",
  "classic-cap": "men-accessories-caps",
  "fabric-pants": "men-clothing-pants",
  hoodie: "women-clothing-hoodies",
  "denim-jacket": "men-clothing-denim-jackets",
  "plain-tshirt": "kids-clothing-t-shirts",
};
