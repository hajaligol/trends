import { and, asc, desc, eq, ilike, inArray, ne, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, productImages, products, productVariants } from "@/lib/db/schema";
import { discountPercent } from "@/lib/utils/money";
import type { ProductSort } from "./presentation";

/**
 * Catalog read model returned to callers (Server Components, future route
 * handlers). These functions are the *only* place in the app that should
 * import from `@/lib/db` for catalog data — components/pages call these,
 * never the Drizzle client directly, per TRENDS_PROJECT_CONTEXT.md §4.2
 * ("database access is isolated").
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

export type CatalogCategoryDetail = CatalogCategory & {
  description: string | null;
};

export async function getCategoryBySlug(slug: string): Promise<CatalogCategoryDetail | null> {
  const [row] = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
    })
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
    .limit(1);
  return row ?? null;
}

/** Simple on-hand-stock badge state. See `product-variants.ts`'s header
 * comment: this reflects Phase 3/4's simple on-hand `stock` column, not
 * Phase 8's reserved-stock/concurrency-safe inventory model. */
export type StockState = "in-stock" | "low-stock" | "out-of-stock";

function stockStateFor(stock: number, lowStockThreshold: number): StockState {
  if (stock <= 0) return "out-of-stock";
  if (stock <= lowStockThreshold) return "low-stock";
  return "in-stock";
}

/** "Any variant sellable" wins over "some variants low" wins over
 * "everything out of stock", so a card/listing shows the most useful
 * state for a product with multiple variants. */
function aggregateStockState(states: StockState[]): StockState {
  if (states.some((state) => state === "in-stock")) return "in-stock";
  if (states.some((state) => state === "low-stock")) return "low-stock";
  return "out-of-stock";
}

export type CatalogProductVariant = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  priceToman: number;
  compareAtPriceToman: number | null;
  stock: number;
  stockState: StockState;
};

type RawVariantRow = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  priceToman: number;
  compareAtPriceToman: number | null;
  stock: number;
  lowStockThreshold: number;
};

function toVariant(row: RawVariantRow): CatalogProductVariant {
  return {
    id: row.id,
    size: row.size,
    color: row.color,
    colorHex: row.colorHex,
    priceToman: row.priceToman,
    compareAtPriceToman: row.compareAtPriceToman,
    stock: row.stock,
    stockState: stockStateFor(row.stock, row.lowStockThreshold),
  };
}

const VARIANT_COLUMNS = {
  id: productVariants.id,
  productId: productVariants.productId,
  size: productVariants.size,
  color: productVariants.color,
  colorHex: productVariants.colorHex,
  priceToman: productVariants.priceToman,
  compareAtPriceToman: productVariants.compareAtPriceToman,
  stock: productVariants.stock,
  lowStockThreshold: productVariants.lowStockThreshold,
} as const;

const IMAGE_COLUMNS = {
  id: productImages.id,
  productId: productImages.productId,
  url: productImages.url,
  altText: productImages.altText,
} as const;

export type CatalogProductSummary = {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  /** Lowest active-variant price, for card display. `null` if the product
   * has no active variants (shouldn't normally happen for a published
   * product, but callers should not assume it can't). */
  fromPriceToman: number | null;
  /** Discount % off the cheapest active variant's compare-at price, or
   * `0` when there's nothing to show (no sale). */
  discountPercent: number;
  /** Distinct variant colors, for swatch dots on cards. */
  colorHexes: string[];
  images: Array<{ url: string; altText: string }>;
  /** Aggregate across active variants — see `aggregateStockState`. */
  stockState: StockState;
};

function buildSummary(
  product: { id: string; slug: string; title: string; categorySlug: string },
  variants: CatalogProductVariant[],
  images: Array<{ url: string; altText: string }>,
): CatalogProductSummary {
  const fromPriceToman =
    variants.length > 0 ? Math.min(...variants.map((variant) => variant.priceToman)) : null;

  const cheapest =
    variants.length > 0
      ? variants.reduce((min, variant) => (variant.priceToman < min.priceToman ? variant : min))
      : null;

  const colorHexes = [
    ...new Set(variants.map((variant) => variant.colorHex).filter((hex): hex is string => hex !== null)),
  ];

  const stockState =
    variants.length > 0 ? aggregateStockState(variants.map((variant) => variant.stockState)) : "out-of-stock";

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    categorySlug: product.categorySlug,
    fromPriceToman,
    discountPercent: cheapest ? discountPercent(cheapest.compareAtPriceToman, cheapest.priceToman) : 0,
    colorHexes,
    images,
    stockState,
  };
}

/** Groups already-fetched variant/image rows by `productId` so N products
 * can be assembled from two batched (`inArray`) queries instead of 2N
 * per-product queries. */
function groupByProductId<T extends { productId: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = map.get(row.productId);
    if (bucket) {
      bucket.push(row);
    } else {
      map.set(row.productId, [row]);
    }
  }
  return map;
}

async function loadProductSummaries(filter: SQL): Promise<CatalogProductSummary[]> {
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

  if (rows.length === 0) return [];

  const productIds = rows.map((row) => row.id);
  const [variantRows, imageRows] = await Promise.all([
    db
      .select(VARIANT_COLUMNS)
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true))),
    db
      .select(IMAGE_COLUMNS)
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.displayOrder)),
  ]);

  const variantsByProduct = groupByProductId(variantRows);
  const imagesByProduct = groupByProductId(imageRows);

  return rows.map((row) =>
    buildSummary(
      row,
      (variantsByProduct.get(row.id) ?? []).map(toVariant),
      (imagesByProduct.get(row.id) ?? []).map((image) => ({ url: image.url, altText: image.altText })),
    ),
  );
}

export async function getFeaturedProducts(): Promise<CatalogProductSummary[]> {
  return loadProductSummaries(eq(products.isFeatured, true));
}

export async function getNewArrivals(): Promise<CatalogProductSummary[]> {
  return loadProductSummaries(eq(products.isNewArrival, true));
}

export type CatalogProductDetail = CatalogProductSummary & {
  shortDescription: string | null;
  longDescription: string | null;
  brand: string | null;
  tags: string[];
  categoryName: string;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Full active-variant list (not just the summary's derived fields) —
   * the product page's size/color picker needs every variant's own price
   * and stock, not just the cheapest one. */
  variants: CatalogProductVariant[];
};

export async function getProductDetailBySlug(slug: string): Promise<CatalogProductDetail | null> {
  const [row] = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      shortDescription: products.shortDescription,
      longDescription: products.longDescription,
      brand: products.brand,
      tags: products.tags,
      seoTitle: products.seoTitle,
      seoDescription: products.seoDescription,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);

  if (!row) return null;

  const [variantRows, imageRows] = await Promise.all([
    db
      .select(VARIANT_COLUMNS)
      .from(productVariants)
      .where(and(eq(productVariants.productId, row.id), eq(productVariants.isActive, true))),
    db
      .select(IMAGE_COLUMNS)
      .from(productImages)
      .where(eq(productImages.productId, row.id))
      .orderBy(asc(productImages.displayOrder)),
  ]);

  const variants = variantRows.map(toVariant);
  const images = imageRows.map((image) => ({ url: image.url, altText: image.altText }));
  const summary = buildSummary(row, variants, images);

  return {
    ...summary,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    brand: row.brand,
    tags: row.tags,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    categoryName: row.categoryName,
    variants,
  };
}

/** Other active products from the same category, for a product page's
 * "related products" rail. Small, fixed-size result — no pagination. */
export async function getRelatedProducts(
  categorySlug: string,
  excludeProductId: string,
  limit = 4,
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
    .where(
      and(eq(categories.slug, categorySlug), eq(products.isActive, true), ne(products.id, excludeProductId)),
    )
    .orderBy(desc(products.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const productIds = rows.map((row) => row.id);
  const [variantRows, imageRows] = await Promise.all([
    db
      .select(VARIANT_COLUMNS)
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true))),
    db
      .select(IMAGE_COLUMNS)
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.displayOrder)),
  ]);

  const variantsByProduct = groupByProductId(variantRows);
  const imagesByProduct = groupByProductId(imageRows);

  return rows.map((row) =>
    buildSummary(
      row,
      (variantsByProduct.get(row.id) ?? []).map(toVariant),
      (imagesByProduct.get(row.id) ?? []).map((image) => ({ url: image.url, altText: image.altText })),
    ),
  );
}

const SEARCH_PAGE_SIZE = 12;

export type SearchResult = {
  query: string;
  products: CatalogProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Real product search (Phase 5). Plain PostgreSQL `ILIKE` over
 * title/short description/brand — the "sensible PostgreSQL search first"
 * TRENDS_PROJECT_CONTEXT.md §5 calls for, not Elasticsearch/Meilisearch,
 * which the same section explicitly says not to add until scale actually
 * requires it. Sorting/pagination happen in application code after one
 * batched fetch, same documented tradeoff as `getProductsByCategorySlug`
 * (fine at this catalog size; revisit with `WHERE`/`ORDER BY`/`LIMIT` if
 * the catalog grows to hundreds/thousands of rows).
 */
export async function searchProducts(params: {
  q: string;
  page?: number;
  sort?: ProductSort;
}): Promise<SearchResult> {
  const q = params.q.trim();
  const sort = params.sort ?? "newest";

  if (q.length === 0) {
    return { query: q, products: [], total: 0, page: 1, pageSize: SEARCH_PAGE_SIZE, totalPages: 0 };
  }

  const pattern = `%${q}%`;
  const productRows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      categorySlug: categories.slug,
      createdAt: products.createdAt,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.isActive, true),
        or(
          ilike(products.title, pattern),
          ilike(products.shortDescription, pattern),
          ilike(products.brand, pattern),
        ),
      ),
    );

  if (productRows.length === 0) {
    return { query: q, products: [], total: 0, page: 1, pageSize: SEARCH_PAGE_SIZE, totalPages: 0 };
  }

  const productIds = productRows.map((row) => row.id);
  const [variantRows, imageRows] = await Promise.all([
    db
      .select(VARIANT_COLUMNS)
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true))),
    db
      .select(IMAGE_COLUMNS)
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.displayOrder)),
  ]);

  const variantsByProduct = groupByProductId(variantRows);
  const imagesByProduct = groupByProductId(imageRows);

  const summaries = productRows.map((row) =>
    buildSummary(
      row,
      (variantsByProduct.get(row.id) ?? []).map(toVariant),
      (imagesByProduct.get(row.id) ?? []).map((image) => ({ url: image.url, altText: image.altText })),
    ),
  );

  const createdAtBySlug = new Map(productRows.map((row) => [row.slug, row.createdAt]));
  const sorted = [...summaries].sort((a, b) => {
    if (sort === "price-asc") return (a.fromPriceToman ?? Infinity) - (b.fromPriceToman ?? Infinity);
    if (sort === "price-desc") return (b.fromPriceToman ?? -Infinity) - (a.fromPriceToman ?? -Infinity);
    const aCreatedAt = createdAtBySlug.get(a.slug);
    const bCreatedAt = createdAtBySlug.get(b.slug);
    return (bCreatedAt?.getTime() ?? 0) - (aCreatedAt?.getTime() ?? 0);
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), totalPages);
  const start = (page - 1) * SEARCH_PAGE_SIZE;
  const pageItems = sorted.slice(start, start + SEARCH_PAGE_SIZE);

  return { query: q, products: pageItems, total, page, pageSize: SEARCH_PAGE_SIZE, totalPages };
}

/**
 * Minimal slug + last-modified data for every indexable storefront URL,
 * for `sitemap.ts` (Phase 5). Deliberately returns nothing beyond what a
 * sitemap needs — no variants/images — since this is a lightweight,
 * whole-catalog query.
 */
export async function getSitemapEntries(): Promise<{
  categories: Array<{ slug: string; updatedAt: Date }>;
  products: Array<{ slug: string; updatedAt: Date }>;
}> {
  const [categoryRows, productRows] = await Promise.all([
    db
      .select({ slug: categories.slug, updatedAt: categories.updatedAt })
      .from(categories)
      .where(eq(categories.isActive, true)),
    db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.isActive, true)),
  ]);
  return { categories: categoryRows, products: productRows };
}

const CATEGORY_PAGE_SIZE = 12;

export type CategoryProductsResult = {
  category: CatalogCategoryDetail;
  products: CatalogProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Distinct size/color values across *all* of the category's products
   * (before the current size/color filter is applied), so filter controls
   * don't disappear once a filter narrows the visible results. */
  availableSizes: string[];
  availableColors: Array<{ color: string; colorHex: string | null }>;
};

/**
 * Category listing: browsable, filterable (size/color), sortable
 * (newest/price), paginated product grid for one category.
 *
 * Filtering/sorting/pagination happen in application code after a single
 * batched fetch of the category's products, rather than pushed into SQL.
 * That's the right tradeoff at the catalog's current scale (a handful of
 * products per category) per rule F.1 ("prefer the simplest
 * production-safe solution") — it is *not* the right long-term approach
 * once a category can hold hundreds/thousands of products, at which point
 * this should move to `WHERE`/`ORDER BY`/`LIMIT ... OFFSET` in the query
 * itself (flagged in PROGRESS.md for whoever picks this up when catalog
 * size grows, likely around Phase 5's search work).
 */
export async function getProductsByCategorySlug(params: {
  slug: string;
  page?: number;
  sort?: ProductSort;
  size?: string;
  color?: string;
}): Promise<CategoryProductsResult | null> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return null;

  const sort = params.sort ?? "newest";

  const productRows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      categorySlug: categories.slug,
      createdAt: products.createdAt,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.categoryId, category.id), eq(products.isActive, true)));

  if (productRows.length === 0) {
    return {
      category,
      products: [],
      total: 0,
      page: 1,
      pageSize: CATEGORY_PAGE_SIZE,
      totalPages: 0,
      availableSizes: [],
      availableColors: [],
    };
  }

  const productIds = productRows.map((row) => row.id);
  const [variantRows, imageRows] = await Promise.all([
    db
      .select(VARIANT_COLUMNS)
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true))),
    db
      .select(IMAGE_COLUMNS)
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.displayOrder)),
  ]);

  const variantsByProduct = groupByProductId(variantRows);
  const imagesByProduct = groupByProductId(imageRows);

  const availableSizes = [...new Set(variantRows.map((variant) => variant.size))].sort((a, b) =>
    a.localeCompare(b, "fa"),
  );

  const availableColorsMap = new Map<string, string | null>();
  for (const variant of variantRows) {
    if (!availableColorsMap.has(variant.color)) {
      availableColorsMap.set(variant.color, variant.colorHex);
    }
  }
  const availableColors = [...availableColorsMap.entries()].map(([color, colorHex]) => ({
    color,
    colorHex,
  }));

  const withVariants = productRows.map((row) => ({
    row,
    rawVariants: variantsByProduct.get(row.id) ?? [],
  }));

  const filtered = withVariants.filter(({ rawVariants }) => {
    if (params.size && !rawVariants.some((variant) => variant.size === params.size)) return false;
    if (params.color && !rawVariants.some((variant) => variant.color === params.color)) return false;
    return true;
  });

  const summaries = filtered.map(({ row, rawVariants }) =>
    buildSummary(
      row,
      rawVariants.map(toVariant),
      (imagesByProduct.get(row.id) ?? []).map((image) => ({ url: image.url, altText: image.altText })),
    ),
  );

  const createdAtBySlug = new Map(productRows.map((row) => [row.slug, row.createdAt]));
  const sorted = [...summaries].sort((a, b) => {
    if (sort === "price-asc") return (a.fromPriceToman ?? Infinity) - (b.fromPriceToman ?? Infinity);
    if (sort === "price-desc") return (b.fromPriceToman ?? -Infinity) - (a.fromPriceToman ?? -Infinity);
    const aCreatedAt = createdAtBySlug.get(a.slug);
    const bCreatedAt = createdAtBySlug.get(b.slug);
    return (bCreatedAt?.getTime() ?? 0) - (aCreatedAt?.getTime() ?? 0);
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), totalPages);
  const start = (page - 1) * CATEGORY_PAGE_SIZE;
  const pageItems = sorted.slice(start, start + CATEGORY_PAGE_SIZE);

  return {
    category,
    products: pageItems,
    total,
    page,
    pageSize: CATEGORY_PAGE_SIZE,
    totalPages,
    availableSizes,
    availableColors,
  };
}
