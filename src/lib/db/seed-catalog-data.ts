/**
 * Seed data + logic for the demo catalog: a set of **fictional** brands and
 * one-or-more products for **every leaf (type) category** that exists in the
 * database, each product assigned to a brand from the managed `brands` list.
 *
 * Guarantees (asserted at the end of `seedCatalog`, which throws — and so
 * rolls the transaction back — if any of them is false):
 *   - every leaf category has at least one product;
 *   - every brand has at least one product.
 *
 * Categories are READ from the database (never created/deleted here), so a
 * category the admin added later is covered too. Brand names are invented
 * placeholders and may coincide with real brands by accident; replace them in
 * `/admin/brands`. No images/logos are created.
 */
import { sql } from "drizzle-orm";
import type { DbTransaction } from "./client";
import { brands, categories, products } from "./schema";
import { generateProductSlug, insertVariantsBulk } from "@/domains/catalog/product-service";

type BrandSeed = {
  key: string;
  name: string;
  nameEn: string;
  countryOfOrigin: string;
  description: string;
};

export const BRAND_SEEDS: ReadonlyArray<BrandSeed> = [
  { key: "toranj", name: "ترنج", nameEn: "Toranj", countryOfOrigin: "ایران", description: "پوشاک روزمره با الهام از رنگ‌های گرم و طبیعی." },
  { key: "parsa", name: "پارسا مد", nameEn: "Parsa Mode", countryOfOrigin: "ایران", description: "لباس‌های کلاسیک و رسمی با دوخت تمیز." },
  { key: "ava", name: "آوا", nameEn: "Ava", countryOfOrigin: "ایران", description: "طرح‌های ساده و راحت برای استفاده هر روز." },
  { key: "nila", name: "نیلا", nameEn: "Nila", countryOfOrigin: "ایران", description: "پوشاک زنانه و مردانه با رنگ‌های ملایم." },
  { key: "aura", name: "اورا", nameEn: "Aura", countryOfOrigin: "ترکیه", description: "مد روز با برش‌های مدرن." },
  { key: "urban-line", name: "اوربان لاین", nameEn: "Urban Line", countryOfOrigin: "ترکیه", description: "استایل شهری و کژوال." },
  { key: "classico", name: "کلاسیکو", nameEn: "Classico", countryOfOrigin: "ایتالیا", description: "خطوط کلاسیک و پارچه‌های مرغوب." },
  { key: "nordic", name: "نوردیک", nameEn: "Nordic", countryOfOrigin: "سوئد", description: "لباس‌های گرم و مینیمال برای فصل سرد." },
  { key: "delta-sport", name: "دلتا اسپرت", nameEn: "Delta Sport", countryOfOrigin: "ایران", description: "پوشاک و کفش ورزشی." },
  { key: "step", name: "استپ", nameEn: "Step", countryOfOrigin: "ایران", description: "کفش راحتی برای پیاده‌روی و استفاده روزانه." },
  { key: "walker", name: "واکر", nameEn: "Walker", countryOfOrigin: "ترکیه", description: "کفش‌های بادوام شهری." },
  { key: "charmineh", name: "چرمینه", nameEn: "Charmineh", countryOfOrigin: "ایران", description: "کیف و کفش چرم." },
  { key: "marina", name: "مارینا", nameEn: "Marina", countryOfOrigin: "ایتالیا", description: "کیف و کفش با طراحی ظریف." },
  { key: "laleh", name: "لاله", nameEn: "Laleh", countryOfOrigin: "ایران", description: "کیف و اکسسوری دست‌ساز." },
  { key: "blumond", name: "بلومون", nameEn: "Blumond", countryOfOrigin: "فرانسه", description: "اکسسوری و کیف مینیمال." },
  { key: "zarrin", name: "زرین", nameEn: "Zarrin", countryOfOrigin: "ایران", description: "اکسسوری و زیورآلات." },
  { key: "kahroba", name: "کهربا", nameEn: "Kahroba", countryOfOrigin: "ایران", description: "ساعت، عینک و اکسسوری." },
  { key: "sunset", name: "سان‌ست", nameEn: "Sunset", countryOfOrigin: "اسپانیا", description: "عینک و اکسسوری تابستانی." },
  { key: "little-star", name: "ستاره کوچولو", nameEn: "Little Star", countryOfOrigin: "ایران", description: "لباس و لوازم بچگانه نرم و راحت." },
  { key: "kidzo", name: "کیدزو", nameEn: "Kidzo", countryOfOrigin: "ترکیه", description: "پوشاک و کفش بچگانه رنگارنگ." },
];

type Group = "clothing" | "shoes" | "bags" | "accessories";

/** Which brands may carry which kind of product. Every brand appears in at
 * least one pool; the per-pool round-robin below then reaches all of them. */
const ADULT_POOLS: Record<Group, string[]> = {
  clothing: ["toranj", "parsa", "ava", "nila", "aura", "urban-line", "classico", "nordic", "delta-sport"],
  shoes: ["step", "walker", "charmineh", "delta-sport", "marina"],
  bags: ["charmineh", "marina", "laleh", "blumond"],
  accessories: ["zarrin", "kahroba", "blumond", "sunset", "laleh"],
};
const KIDS_POOLS: Record<Group, string[]> = {
  clothing: ["little-star", "kidzo"],
  shoes: ["step", "kidzo"],
  bags: ["little-star", "kidzo"],
  accessories: ["kidzo", "little-star", "zarrin"],
};

const ADJECTIVES: Record<Group, string[]> = {
  clothing: ["کلاسیک", "ساده", "راحتی", "اسپرت", "مجلسی", "روزمره"],
  shoes: ["راحتی", "اسپرت", "کلاسیک", "روزمره"],
  bags: ["کلاسیک", "روزمره", "مینیمال", "اسپرت"],
  accessories: ["کلاسیک", "مینیمال", "روزمره", "شیک"],
};
const KIDS_ADJECTIVES = ["شاد", "راحتی", "روزمره", "رنگارنگ"];

const COLOR_CODES = ["BLK", "WHT", "NVY", "BEG", "GRY", "BRN", "OLV", "LBL", "PNK", "CRM", "DGY", "BLS"];
const KIDS_COLOR_CODES = ["BLU", "PNK", "LBL", "GRN", "LIL", "WHT", "BLS", "YLW"];

const GROUP_KEYS: Group[] = ["clothing", "shoes", "bags", "accessories"];

type LeafInfo = { id: string; slug: string; name: string; audience: string; group: Group; isKids: boolean };

/** Leaf = a category nobody has as parent. Audience/group come from the
 * ancestors' slugs, with safe fallbacks for unusual admin-made categories. */
function resolveLeaves(
  rows: Array<{ id: string; slug: string; name: string; parentId: string | null }>,
): LeafInfo[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const parentIds = new Set(rows.map((row) => row.parentId).filter((id): id is string => Boolean(id)));

  return rows
    .filter((row) => !parentIds.has(row.id))
    .map((row) => {
      const chain: typeof rows = [];
      for (let cursor: (typeof rows)[number] | undefined = row; cursor; cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined) {
        chain.unshift(cursor);
        if (chain.length > 6) break; // defensive: never loop on bad data
      }
      const root = chain[0]!;
      const groupRow = chain[1] ?? row;
      const group = GROUP_KEYS.find((key) => groupRow.slug.endsWith(`-${key}`) || groupRow.slug === key) ?? "accessories";
      return { id: row.id, slug: row.slug, name: row.name, audience: root.slug, group, isKids: root.slug === "kids" };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const LETTER_SIZES = ["S", "M", "L", "XL"];
const KIDS_CLOTHING_SIZES = ["۴ سال", "۶ سال", "۸ سال"];

function sizesFor(leaf: LeafInfo): string[] {
  if (leaf.group === "shoes") {
    if (leaf.isKids) return ["28", "30", "32", "34"];
    return leaf.audience === "women" ? ["36", "37", "38", "39", "40", "41"] : ["40", "41", "42", "43", "44", "45"];
  }
  if (leaf.group === "clothing") return leaf.isKids ? KIDS_CLOTHING_SIZES : LETTER_SIZES;
  return ["فری‌سایز"];
}

const BASE_PRICE: Record<Group, [min: number, step: number, steps: number]> = {
  clothing: [450_000, 90_000, 18],
  shoes: [1_200_000, 130_000, 18],
  bags: [900_000, 120_000, 16],
  accessories: [150_000, 70_000, 22],
};

function roundThousand(value: number): number {
  return Math.round(value / 1000) * 1000;
}

export type SeedCatalogResult = { brands: number; products: number; variants: number; leaves: number };

/**
 * Inserts brands + products. Expects to run inside a transaction **after**
 * the old products/brands were deleted (the CLI and `seed.ts` both do that).
 */
export async function seedCatalog(tx: DbTransaction): Promise<SeedCatalogResult> {
  const categoryRows = await tx
    .select({ id: categories.id, slug: categories.slug, name: categories.name, parentId: categories.parentId })
    .from(categories);
  const leaves = resolveLeaves(categoryRows);
  if (leaves.length === 0) throw new Error("No categories found — run `npm run db:seed` or `npm run db:sync-categories` first.");

  // 1) Brands (all active, display order = list order).
  const insertedBrands = await tx
    .insert(brands)
    .values(
      BRAND_SEEDS.map((brand, index) => ({
        name: brand.name,
        nameEn: brand.nameEn,
        // Latin name → short stable slug (`nike`-style), unique by construction.
        slug: brand.key,
        countryOfOrigin: brand.countryOfOrigin,
        description: brand.description,
        displayOrder: index,
        isActive: true,
      })),
    )
    .returning({ id: brands.id, slug: brands.slug });
  const brandIdByKey = new Map(insertedBrands.map((row) => [row.slug, row.id]));

  // 2) Products: one per leaf, brand picked round-robin from the pool for
  //    its group so every pooled brand is reached.
  const cursorByPool = new Map<string, number>();
  let variantTotal = 0;

  for (const [index, leaf] of leaves.entries()) {
    const pool = (leaf.isKids ? KIDS_POOLS : ADULT_POOLS)[leaf.group];
    const poolKey = `${leaf.isKids ? "kids" : "adult"}-${leaf.group}`;
    const cursor = cursorByPool.get(poolKey) ?? 0;
    cursorByPool.set(poolKey, cursor + 1);
    const brandKey = pool[cursor % pool.length]!;
    const brandId = brandIdByKey.get(brandKey);
    if (!brandId) throw new Error(`Brand "${brandKey}" is in a pool but not in BRAND_SEEDS`);

    const adjectives = leaf.isKids ? KIDS_ADJECTIVES : ADJECTIVES[leaf.group];
    const title = `${leaf.name} ${adjectives[cursor % adjectives.length]}`;

    const slug = await generateProductSlug(title, tx);
    const [created] = await tx
      .insert(products)
      .values({
        slug,
        title,
        shortDescription: `${leaf.name}، مناسب استفاده روزمره با جنس و دوخت مرغوب.`,
        longDescription: `${leaf.name} با طراحی ساده و کاربردی.\nبرای اطلاعات سایز و رنگ‌بندی، جدول مشخصات و انواع محصول را ببینید.`,
        categoryId: leaf.id,
        brandId,
        tags: [leaf.name],
        isActive: true,
        // A spread of flags so the homepage rows have content.
        isFeatured: index % 11 === 0,
        isNewArrival: index % 13 === 1,
      })
      .returning({ id: products.id, productCode: products.productCode });
    if (!created) throw new Error("product insert returned no row");

    const [minPrice, step, steps] = BASE_PRICE[leaf.group];
    const kidsFactor = leaf.isKids ? 0.6 : 1;
    const price = roundThousand((minPrice + step * ((index * 7) % steps)) * kidsFactor);
    const onSale = index % 5 === 2;
    const compareAt = onSale ? roundThousand(price * 1.25) : null;

    const colorPool = leaf.isKids ? KIDS_COLOR_CODES : COLOR_CODES;
    const colors = [colorPool[index % colorPool.length]!, colorPool[(index + 4) % colorPool.length]!];
    const sizes = sizesFor(leaf);

    const rows = sizes.flatMap((size, sizeIndex) =>
      colors.map((colorCode, colorIndex) => ({
        size,
        colorCode,
        priceToman: price,
        compareAtPriceToman: compareAt,
        // Mostly healthy stock; a few low / sold-out variants to exercise the UI.
        stock: (index + sizeIndex + colorIndex) % 17 === 0 ? 0 : (index + sizeIndex * 3 + colorIndex * 5) % 9 === 0 ? 3 : 8 + ((index + sizeIndex + colorIndex * 7) % 25),
      })),
    );

    const result = await insertVariantsBulk(tx, created, { material: null, lowStockThreshold: 5, isActive: true, rows });
    variantTotal += result.created;
  }

  // 3) Guarantees.
  const leafIds = new Set(leaves.map((leaf) => leaf.id));
  const withProducts = await tx.selectDistinct({ categoryId: products.categoryId }).from(products);
  const missingCategories = [...leafIds].filter((id) => !withProducts.some((row) => row.categoryId === id));
  if (missingCategories.length > 0) throw new Error(`${missingCategories.length} leaf categories ended up without a product`);

  const emptyBrands = await tx
    .select({ name: brands.name })
    .from(brands)
    .where(sql`not exists (select 1 from ${products} where ${products.brandId} = ${brands.id})`);
  if (emptyBrands.length > 0) throw new Error(`Brands without products: ${emptyBrands.map((b) => b.name).join(", ")}`);

  return { brands: insertedBrands.length, products: leaves.length, variants: variantTotal, leaves: leaves.length };
}
