import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, productImages, products, productVariants } from "@/lib/db/schema";

/**
 * Catalog read model returned to callers (Server Components, future route
 * handlers). Deliberately shaped close to the Phase 2 demo-data types
 * (`DemoProduct`/`DemoCategory`/...) so Phase 4 can swap the homepage's
 * demo-data imports for these functions with minimal component changes —
 * see the comment at the top of `src/domains/catalog/demo-data.ts`.
 *
 * These functions are the *only* place in the app that should import from
 * `@/lib/db` for catalog data — components/pages call these, never the
 * Drizzle client directly, per TRENDS_PROJECT_CONTEXT.md §4.2 ("database
 * access is isolated").
 */

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
};

export async function getActiveCategories(): Promise<CatalogCategory[]> {
  const rows = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.displayOrder));
  return rows;
}

export type CatalogProductVariant = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  priceToman: number;
  compareAtPriceToman: number | null;
  stock: number;
};

export type CatalogProductSummary = {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  /** Lowest active-variant price, for card display. `null` if the product
   * has no active variants (shouldn't normally happen for a published
   * product, but callers should not assume it can't). */
  fromPriceToman: number | null;
  /** Distinct variant colors, for swatch dots on cards. */
  colorHexes: string[];
  images: Array<{ url: string; altText: string }>;
};

async function toProductSummary(
  product: {
    id: string;
    slug: string;
    title: string;
    categorySlug: string;
  },
  variants: CatalogProductVariant[],
  images: Array<{ url: string; altText: string }>,
): Promise<CatalogProductSummary> {
  const activeVariants = variants.filter((v) => v.stock >= 0);
  const fromPriceToman =
    activeVariants.length > 0
      ? Math.min(...activeVariants.map((v) => v.priceToman))
      : null;
  const colorHexes = [
    ...new Set(activeVariants.map((v) => v.colorHex).filter((hex): hex is string => hex !== null)),
  ];
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    categorySlug: product.categorySlug,
    fromPriceToman,
    colorHexes,
    images,
  };
}

async function loadProductSummaries(
  filter: SQL,
): Promise<CatalogProductSummary[]> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.isActive, true), filter))
    .orderBy(asc(products.createdAt));

  const summaries = await Promise.all(
    rows.map(async (row) => {
      const [variants, images] = await Promise.all([
        db
          .select({
            id: productVariants.id,
            size: productVariants.size,
            color: productVariants.color,
            colorHex: productVariants.colorHex,
            priceToman: productVariants.priceToman,
            compareAtPriceToman: productVariants.compareAtPriceToman,
            stock: productVariants.stock,
          })
          .from(productVariants)
          .where(
            and(eq(productVariants.productId, row.id), eq(productVariants.isActive, true)),
          ),
        db
          .select({ url: productImages.url, altText: productImages.altText })
          .from(productImages)
          .where(eq(productImages.productId, row.id))
          .orderBy(asc(productImages.displayOrder)),
      ]);
      return toProductSummary(row, variants, images);
    }),
  );

  return summaries;
}

export async function getFeaturedProducts(): Promise<CatalogProductSummary[]> {
  return loadProductSummaries(eq(products.isFeatured, true));
}

export async function getNewArrivals(): Promise<CatalogProductSummary[]> {
  return loadProductSummaries(eq(products.isNewArrival, true));
}

export async function getProductBySlug(
  slug: string,
): Promise<CatalogProductSummary | null> {
  const [row] = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);

  if (!row) return null;

  const [variants, images] = await Promise.all([
    db
      .select({
        id: productVariants.id,
        size: productVariants.size,
        color: productVariants.color,
        colorHex: productVariants.colorHex,
        priceToman: productVariants.priceToman,
        compareAtPriceToman: productVariants.compareAtPriceToman,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .where(and(eq(productVariants.productId, row.id), eq(productVariants.isActive, true))),
    db
      .select({ url: productImages.url, altText: productImages.altText })
      .from(productImages)
      .where(eq(productImages.productId, row.id))
      .orderBy(asc(productImages.displayOrder)),
  ]);

  return toProductSummary(row, variants, images);
}
