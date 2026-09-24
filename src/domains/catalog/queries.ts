import { cache } from "react";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, orderItems, orders, productImages, products, productVariants } from "@/lib/db/schema";
import { discountPercent } from "@/lib/utils/money";
import {
  buildCategoryTree,
  collectSubtreeIds,
  findCategoryPath,
  flattenCategoryTree,
  getCategoryTrail,
  type CategoryNode,
  type CategoryRow,
} from "@/domains/categories/tree";
import type { ProductSort } from "./presentation";
import { listProductSpecifications, type SpecificationRow } from "@/domains/catalog/specifications";

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
  imageUrl: string | null;
};

/** Minimal link-shaped category reference (breadcrumbs, menus). */
export type CategoryLink = { slug: string; name: string };

function toCatalogCategory(node: CategoryNode): CatalogCategory {
  return { id: node.id, slug: node.slug, name: node.name, imageUrl: node.imageUrl };
}

/**
 * Every category row, active or not, in a single query. `cache()`d so the
 * root layout (header/footer menu), the page body and `generateMetadata`
 * of one request share one round trip. The table is tiny (a couple of
 * hundred rows for the full three-level taxonomy) — see `tree.ts`.
 */
const loadAllCategoryRows = cache(async (): Promise<CategoryRow[]> => {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      imageUrl: categories.imageUrl,
      parentId: categories.parentId,
      displayOrder: categories.displayOrder,
      isActive: categories.isActive,
    })
    .from(categories);
});

/**
 * The storefront category tree: audience > group > type, active only. An
 * inactive category hides its whole branch (see `buildCategoryTree`). The
 * header/footer menus, the homepage circles, category pages and the
 * sitemap all read from this one function.
 */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  return buildCategoryTree(await loadAllCategoryRows(), { activeOnly: true });
});

/** The top-level audiences (مردانه/زنانه/بچگانه), for the homepage circles. */
export async function getRootCategories(): Promise<CatalogCategory[]> {
  return (await getCategoryTree()).map(toCatalogCategory);
}

export type CatalogCategoryDetail = CatalogCategory & {
  description: string | null;
  /** 1 = audience, 2 = group, 3 = type. */
  depth: number;
  /** Ancestors, root first, **excluding** this category. */
  trail: CategoryLink[];
  /** Direct active sub-categories (empty for a type category). */
  children: CatalogCategory[];
  /** This category's siblings **including itself**; empty for a root. Lets
   * a type page offer "other types in this group" navigation. */
  siblings: CatalogCategory[];
};

/** Resolves a slug against the active tree: the category itself, its
 * ancestor path and the ids of everything beneath it. */
async function resolveActiveCategory(slug: string) {
  const tree = await getCategoryTree();
  const path = findCategoryPath(tree, slug);
  if (!path) return null;
  const node = path[path.length - 1]!;
  const parent = path.length > 1 ? path[path.length - 2]! : null;

  const detail: CatalogCategoryDetail = {
    ...toCatalogCategory(node),
    description: node.description,
    depth: node.depth,
    trail: path.slice(0, -1).map((ancestor) => ({ slug: ancestor.slug, name: ancestor.name })),
    children: node.children.map(toCatalogCategory),
    siblings: parent ? parent.children.map(toCatalogCategory) : [],
  };
  return { detail, subtreeIds: collectSubtreeIds(node), parent };
}

export async function getCategoryBySlug(slug: string): Promise<CatalogCategoryDetail | null> {
  return (await resolveActiveCategory(slug))?.detail ?? null;
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
  /** Free-text fabric/material of this variant (may be null). Shown in the
   * product page's specifications tab; never used for pricing/stock. */
  material: string | null;
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
  material: string | null;
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
    material: row.material,
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
  material: productVariants.material,
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

/** Product summaries for an explicit set of ids, in no particular
 * guaranteed order (callers that care, like the wishlist page, sort
 * client-side or don't need to). Used by
 * `src/domains/wishlist/queries.ts` so the wishlist page's cards reuse
 * this exact read-model instead of a bespoke shape. */
export async function getProductSummariesByIds(ids: string[]): Promise<CatalogProductSummary[]> {
  if (ids.length === 0) return [];
  return loadProductSummaries(inArray(products.id, ids));
}

export async function getNewArrivals(): Promise<CatalogProductSummary[]> {
  return loadProductSummaries(eq(products.isNewArrival, true));
}

/** Order statuses whose units count as "sold". `pending_payment` (not yet
 * paid), `cancelled` and `refunded` are deliberately excluded so an
 * abandoned or reversed order can't push a product up the ranking. */
const SALES_COUNTING_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

/**
 * Best sellers for the homepage: active products ranked by total units
 * sold across paid-or-later orders (`order_items.quantity`, summed over
 * every variant of the product), best first. Ties break on product id so
 * the order is stable between requests.
 *
 * Returns **only products that have actually sold** — it never pads the
 * list with unsold products, so an empty array (no paid orders yet) is a
 * normal result and the homepage hides the section.
 */
export async function getTopSellingProducts(limit = 5): Promise<CatalogProductSummary[]> {
  const unitsSold = sql<number>`sum(${orderItems.quantity})::int`;

  const ranked = await db
    .select({ productId: orderItems.productId, unitsSold })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(and(inArray(orders.status, [...SALES_COUNTING_STATUSES]), eq(products.isActive, true)))
    .groupBy(orderItems.productId)
    .orderBy(desc(unitsSold), asc(orderItems.productId))
    .limit(limit);

  const rankedIds = ranked.map((row) => row.productId).filter((id): id is string => id !== null);
  if (rankedIds.length === 0) return [];

  // `loadProductSummaries` orders by createdAt; restore the sales ranking.
  const summaries = await loadProductSummaries(inArray(products.id, rankedIds));
  const rankById = new Map(rankedIds.map((id, index) => [id, index]));
  return summaries.sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0));
}

export type CatalogProductDetail = CatalogProductSummary & {
  shortDescription: string | null;
  longDescription: string | null;
  brand: string | null;
  tags: string[];
  categoryName: string;
  /** Full breadcrumb path of the product's category, root first and the
   * product's own (type) category last — e.g. مردانه › لباس مردانه ›
   * پیراهن مردانه. Built from *all* categories (not just active ones) so
   * the breadcrumb stays complete even if a branch was later switched off. */
  categoryTrail: CategoryLink[];
  seoTitle: string | null;
  seoDescription: string | null;
  /** Full active-variant list (not just the summary's derived fields) —
   * the product page's size/color picker needs every variant's own price
   * and stock, not just the cheapest one. */
  variants: CatalogProductVariant[];
  /** Admin-authored extra rows of the specifications table, in order. */
  specifications: SpecificationRow[];
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
      categoryId: products.categoryId,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);

  if (!row) return null;

  const categoryTrail = getCategoryTrail(await loadAllCategoryRows(), row.categoryId).map((category) => ({
    slug: category.slug,
    name: category.name,
  }));

  const [variantRows, imageRows, specifications] = await Promise.all([
    db
      .select(VARIANT_COLUMNS)
      .from(productVariants)
      .where(and(eq(productVariants.productId, row.id), eq(productVariants.isActive, true))),
    db
      .select(IMAGE_COLUMNS)
      .from(productImages)
      .where(eq(productImages.productId, row.id))
      .orderBy(asc(productImages.displayOrder)),
    listProductSpecifications(row.id),
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
    categoryTrail,
    variants,
    specifications,
  };
}

/**
 * "You may also like" rail for a product page: other active products from
 * the same type category first (newest first), topped up from the rest of
 * its group (e.g. other men's clothing) so a sparsely-stocked type still
 * gets a full rail. Small, fixed-size result — no pagination.
 */
export async function getRelatedProducts(
  categorySlug: string,
  excludeProductId: string,
  limit = 4,
): Promise<CatalogProductSummary[]> {
  const allRows = await loadAllCategoryRows();
  const own = allRows.find((row) => row.slug === categorySlug);
  if (!own) return [];

  // Widen to the parent group's subtree when there is one; a category
  // with no parent (legacy root-level product) just uses its own subtree.
  // Built from all rows, not the active-only tree: a product stays
  // purchasable while its category's visibility is a separate concern.
  const scopeId = own.parentId ?? own.id;
  const scopeNode = flattenCategoryTree(buildCategoryTree(allRows)).find((node) => node.id === scopeId);
  const scopeIds = scopeNode ? collectSubtreeIds(scopeNode) : [own.id];

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
      and(inArray(products.categoryId, scopeIds), eq(products.isActive, true), ne(products.id, excludeProductId)),
    )
    // Same-category matches sort ahead of the rest of the group.
    .orderBy(desc(sql`(${products.categoryId} = ${own.id})`), desc(products.createdAt))
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
          // Category name too, so "کفش" or "هودی زنانه" finds products
          // whose own title doesn't repeat the word.
          ilike(categories.name, pattern),
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
  // Only categories actually reachable in the storefront tree: a child
  // of a switched-off category 404s, so it must not be in the sitemap.
  const visibleSlugs = new Set(flattenCategoryTree(await getCategoryTree()).map((node) => node.slug));
  const [categoryRows, productRows] = await Promise.all([
    db
      .select({ slug: categories.slug, updatedAt: categories.updatedAt })
      .from(categories)
      .where(eq(categories.isActive, true))
      .then((rows) => rows.filter((row) => visibleSlugs.has(row.slug))),
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
  const resolved = await resolveActiveCategory(params.slug);
  if (!resolved) return null;
  const { detail: category, subtreeIds } = resolved;

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
    // Audience/group pages list everything beneath them, not just products
    // filed directly on that category (products live on the type level).
    .where(and(inArray(products.categoryId, subtreeIds), eq(products.isActive, true)));

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
