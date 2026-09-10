/**
 * Seeds the catalog tables (categories/products/product_variants) from the
 * Phase 2 demo-data fixtures in `src/domains/catalog/demo-data.ts`, so the
 * database has the same content the homepage already renders from those
 * fixtures. Run with `npm run db:seed`.
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
import { categories, productImages, products, productVariants } from "./schema";
import {
  demoCategories,
  demoFeaturedProducts,
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
 * for a flat homepage grid, not a browsable catalog), so this is a Phase 3
 * assumption: each demo product is assigned to the single most plausible
 * category by name, documented here and in PROGRESS.md rather than left
 * implicit. Real category assignment is an admin/catalog-management
 * concern from Phase 11 onward.
 */
const PRODUCT_CATEGORY_SLUG: Record<string, string> = {
  "classic-shirt": "men",
  "womens-knit": "women",
  "minimal-sneaker": "shoes",
  "daily-hoodie": "men",
  "trench-coat": "women",
  backpack: "accessories",
  "classic-cap": "hats",
  "fabric-pants": "men",
  hoodie: "men",
  "denim-jacket": "men",
  "plain-tshirt": "men",
};

async function seedCategories() {
  const rows = await db
    .insert(categories)
    .values(
      demoCategories.map((category, index) => ({
        slug: category.id,
        name: category.label,
        displayOrder: index,
      })),
    )
    .returning();

  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return bySlug;
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

async function seedProducts(categoriesBySlug: Map<string, { id: string }>) {
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
    const categorySlug = PRODUCT_CATEGORY_SLUG[demoProduct.id];
    const category = categorySlug ? categoriesBySlug.get(categorySlug) : undefined;
    if (!category) {
      throw new Error(
        `No category mapping for demo product "${demoProduct.id}" — update PRODUCT_CATEGORY_SLUG in seed.ts.`,
      );
    }

    const priceToman = parseTomanPrice(demoProduct.price);

    const [insertedProduct] = await db
      .insert(products)
      .values({
        slug: demoProduct.id,
        title: demoProduct.name,
        categoryId: category.id,
        isFeatured: demoProduct.isFeatured,
        isNewArrival: demoProduct.isNewArrival,
      })
      .returning();

    if (!insertedProduct) {
      throw new Error(`Failed to insert product "${demoProduct.id}"`);
    }

    const variants = variantsFor(demoProduct.source, priceToman);
    await db.insert(productVariants).values(
      variants.map((variant, index) => ({
        productId: insertedProduct.id,
        sku: `${demoProduct.id}-${index + 1}`.toUpperCase(),
        size: variant.size,
        color: variant.color,
        colorHex: variant.colorHex,
        priceToman,
        stock: 25,
      })),
    );
  }
}

async function main() {
  console.log("Seeding catalog tables...");

  // FK-safe truncation order: children before parents.
  await db.delete(productImages);
  await db.delete(productVariants);
  await db.delete(products);
  await db.delete(categories);

  const categoriesBySlug = await seedCategories();
  console.log(`  Inserted ${categoriesBySlug.size} categories.`);

  await seedProducts(categoriesBySlug);
  console.log(`  Inserted ${demoFeaturedProducts.length + demoNewArrivals.length} products.`);

  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
