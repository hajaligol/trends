/**
 * Seeds the catalog tables: the full category taxonomy from
 * `src/domains/categories/taxonomy.ts`, plus demo brands and products
 * (`seed-catalog-data.ts`: every leaf category gets a product, every brand
 * has products) and the homepage hero/banners from `demo-data.ts`. Run with `npm run db:seed`.
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
import { brands, categories, heroSlides, productImages, products, productVariants, promoBanners } from "./schema";
import { seedCatalog } from "./seed-catalog-data";
import { syncCategoryTaxonomy } from "@/domains/categories/sync";
import { CATEGORY_TAXONOMY } from "@/domains/categories/taxonomy";
import { demoBanners, demoHeroSlides } from "@/domains/catalog/demo-data";

async function seedCategories() {
  // Starts from an empty `categories` table (see `main()`), so the sync
  // simply creates the whole tree: 3 audiences > 12 groups > all types.
  const result = await syncCategoryTaxonomy(db);
  return result.idBySlug;
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
  await db.delete(brands);
  await db.delete(categories);

  const categoriesBySlug = await seedCategories();
  const groupCount = CATEGORY_TAXONOMY.filter((node) => node.depth === 2).length;
  console.log(
    `  Inserted ${categoriesBySlug.size} categories (3 audiences, ${groupCount} groups, ${
      categoriesBySlug.size - 3 - groupCount
    } types).`,
  );

  // Brands + one or more products for every leaf category (see
  // seed-catalog-data.ts). To re-seed ONLY products and brands on an existing
  // database without touching categories, use `npm run db:seed-catalog`.
  const catalog = await db.transaction((tx) => seedCatalog(tx));
  console.log(`  Inserted ${catalog.brands} brands and ${catalog.products} products (${catalog.variants} variants).`);

  await seedHomepageContent();
  console.log(`  Inserted ${demoHeroSlides.length} hero slides and ${demoBanners.length} promo banners.`);

  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
