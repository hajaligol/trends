/**
 * Seeds the catalog tables: the full category taxonomy from
 * `src/domains/categories/taxonomy.ts`, plus products/product_variants
 * from the Phase 2 demo-data fixtures in `src/domains/catalog/demo-data.ts`
 * (so the homepage renders the same content it always did). Run with `npm run db:seed`.
 *
 * This script is intentionally idempotent-by-truncation: it wipes the
 * catalog tables (in FK-safe order) and re-inserts, rather than trying to
 * upsert. That's the right tradeoff for a *seed* script whose only job is
 * "give me a known-good local dataset to develop against" — real customer
 * data will never flow through this path.
 *
 * Not seeded here:
 * - `product_images`: no real product photography has been supplied yet
 *   (see `public/assets/products/.gitkeep`). Inventing fake image URLs
 *   that don't resolve to a real file would violate rule A.17's spirit
 *   ("don't fabricate/pretend things are real that aren't") applied to
 *   media the same way it applies to payment credentials. Product cards
 *   already render `AssetSlot` placeholders when a product has no images
 *   (see Phase 2's `ProductCard.tsx`), so this is a safe gap to leave
 *   open until real photography exists.
 */
import { db } from "./client";
import { buildVariantSku } from "@/domains/catalog/sku";
import { categories, heroSlides, productImages, products, productVariants, promoBanners } from "./schema";
import { syncCategoryTaxonomy } from "@/domains/categories/sync";
import { CATEGORY_TAXONOMY, DEMO_PRODUCT_CATEGORY_SLUG } from "@/domains/categories/taxonomy";
import {
  demoBanners,
  demoFeaturedProducts,
  demoHeroSlides,
  demoNewArrivals,
  type DemoArrival,
  type DemoProduct,
} from "@/domains/catalog/demo-data";

/** "۵۹۰,۰۰۰ تومان" -> 590000. Persian digits + thousands separators + the
 * trailing unit label all need stripping before `Number()` will parse it. */
function parseTomanPrice(display: string): number {
  const persianToArabicDigits = display.replace(
    /[۰-۹]/g,
    (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
  );
  const digitsOnly = persianToArabicDigits.replace(/[^0-9]/g, "");
  const value = Number(digitsOnly);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Could not parse a Toman price from "${display}"`);
  }
  return value;
}

/**
 * The demo fixtures don't carry a category per product (they were written
 * for a flat homepage grid, not a browsable catalog), so each demo product
 * is filed under one leaf ("type") category of the three-level taxonomy —
 * see `DEMO_PRODUCT_CATEGORY_SLUG` in `src/domains/categories/taxonomy.ts`.
 * Real category assignment is an admin/catalog-management concern.
 */
async function seedCategories() {
  // Starts from an empty `categories` table (see `main()`), so the sync
  // simply creates the whole tree: 3 audiences > 12 groups > all types.
  const result = await syncCategoryTaxonomy(db);
  return result.idBySlug;
}

/**
 * Featured demo products have no size/color info at all in the fixture —
 * they're seeded with a single generic variant. New-arrival demo products
 * have a `swatches` color list but still no sizes, so one variant is
 * created per swatch color, all sharing the same size ("Standard") and
 * price. This mirrors exactly what the fixtures contain; it is not meant
 * to represent a real clothing size run (that requires real merchandising
 * data an admin would enter in Phase 11, not something to fabricate here).
 */
function variantsFor(
  product: DemoProduct | DemoArrival,
  priceToman: number,
): Array<{ size: string; color: string; colorHex: string | null }> {
  if ("swatches" in product && product.swatches.length > 0) {
    return product.swatches.map((hex, index) => ({
      size: "Standard",
      color: `رنگ ${index + 1}`,
      colorHex: hex,
    }));
  }
  return [{ size: "M", color: "پیش‌فرض", colorHex: null }];
}

async function seedProducts(categoriesBySlug: Map<string, string>) {
  const allDemoProducts: Array<{
    id: string;
    name: string;
    price: string;
    isFeatured: boolean;
    isNewArrival: boolean;
    source: DemoProduct | DemoArrival;
  }> = [
    ...demoFeaturedProducts.map((p) => ({
      ...p,
      isFeatured: true,
      isNewArrival: false,
      source: p as DemoProduct | DemoArrival,
    })),
    ...demoNewArrivals.map((p) => ({
      ...p,
      isFeatured: false,
      isNewArrival: true,
      source: p as DemoProduct | DemoArrival,
    })),
  ];

  for (const demoProduct of allDemoProducts) {
    const categorySlug = DEMO_PRODUCT_CATEGORY_SLUG[demoProduct.id];
    const categoryId = categorySlug ? categoriesBySlug.get(categorySlug) : undefined;
    if (!categoryId) {
      throw new Error(
        `No category mapping for demo product "${demoProduct.id}" — update DEMO_PRODUCT_CATEGORY_SLUG in taxonomy.ts.`,
      );
    }

    const priceToman = parseTomanPrice(demoProduct.price);

    const [insertedProduct] = await db
      .insert(products)
      .values({
        slug: demoProduct.id,
        title: demoProduct.name,
        categoryId,
        isFeatured: demoProduct.isFeatured,
        isNewArrival: demoProduct.isNewArrival,
      })
      .returning();

    if (!insertedProduct) {
      throw new Error(`Failed to insert product "${demoProduct.id}"`);
    }

    const variants = variantsFor(demoProduct.source, priceToman);
    // SKUs follow the same rule as the admin: <product code>-<size>-<colour>.
    // The index suffix only resolves the rare case of two demo variants that
    // map to the same size/colour token.
    const usedSkus = new Set<string>();
    await db.insert(productVariants).values(
      variants.map((variant, index) => {
        let sku = buildVariantSku(insertedProduct.productCode, variant.size, { name: variant.color, hex: variant.colorHex });
        if (usedSkus.has(sku)) sku = `${sku}-${index + 1}`;
        usedSkus.add(sku);
        return {
          productId: insertedProduct.id,
          sku,
          size: variant.size,
          color: variant.color,
          colorHex: variant.colorHex,
          priceToman,
          stock: 25,
        };
      }),
    );
  }
}

/**
 * Seeds `hero_slides`/`promo_banners` (Phase 11's new admin-editable
 * homepage-content tables) from the exact same fixtures the homepage
 * used to render straight from `demo-data.ts` — so a fresh
 * `db:seed` produces a homepage that looks identical to before this
 * phase, just now backed by editable rows instead of hardcoded arrays.
 */
async function seedHomepageContent() {
  await db.delete(heroSlides);
  await db.delete(promoBanners);

  await db.insert(heroSlides).values(
    demoHeroSlides.map((slide, index) => ({ alt: slide.alt, displayOrder: index })),
  );
  await db.insert(promoBanners).values(
    demoBanners.map((banner, index) => ({
      tone: banner.tone,
      title: banner.title,
      description: banner.description,
      ctaLabel: banner.ctaLabel,
      displayOrder: index,
    })),
  );
}

async function main() {
  console.log("Seeding catalog tables...");

  // FK-safe truncation order: children before parents.
  await db.delete(productImages);
  await db.delete(productVariants);
  await db.delete(products);
  await db.delete(categories);

  const categoriesBySlug = await seedCategories();
  const groupCount = CATEGORY_TAXONOMY.filter((node) => node.depth === 2).length;
  console.log(
    `  Inserted ${categoriesBySlug.size} categories (3 audiences, ${groupCount} groups, ${
      categoriesBySlug.size - 3 - groupCount
    } types).`,
  );

  await seedProducts(categoriesBySlug);
  console.log(`  Inserted ${demoFeaturedProducts.length + demoNewArrivals.length} products.`);

  await seedHomepageContent();
  console.log(`  Inserted ${demoHeroSlides.length} hero slides and ${demoBanners.length} promo banners.`);

  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
