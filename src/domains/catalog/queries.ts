import { cache } from "react";
import { toLatinDigits } from "@/lib/utils/digits";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { ColoredImage } from "@/domains/catalog/gallery";
import { brands, categories, orderItems, orders, productImages, productSlugRedirects, products, productVariants } from "@/lib/db/schema";
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
import { EMPTY_LISTING_FILTERS, type ListingFilters } from "./listing-filters";
import {
  EMPTY_FACETS,
  resolveSort,
  runListing,
  type ListingCandidate,
  type ListingFacets,
} from "./listing-engine";
import type { ProductSort } from "./presentation";
import { normalizeSlugParam } from "./slug";
import {
  bestCampaignInfoFor,
  campaignInfosFor,
  getCatalogPricing,
  priceVariantForCatalog,
  type CatalogCampaignInfo,
  type CatalogPricing,
} from "@/domains/campaigns/pricing";
import type { ProductRef } from "@/domains/campaigns/engine";
import { listProductSpecifications, type SpecificationRow } from "@/domains/catalog/specifications";
import { getProductSizeChart, type SizeChart } from "@/domains/catalog/size-chart";

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

/** `ref` identifies the owning product so a sale campaign covering its
 * brand/category/id lowers the displayed price (display only: the cart and
 * order recompute from the database). */
function toVariant(row: RawVariantRow, pricing: CatalogPricing, ref: ProductRef): CatalogProductVariant {
  const price = priceVariantForCatalog(pricing, ref, row);
  return {
    id: row.id,
    size: row.size,
    color: row.color,
    colorHex: row.colorHex,
    material: row.material,
    priceToman: price.priceToman,
    compareAtPriceToman: price.compareAtPriceToman,
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
  color: productImages.color,
} as const;

export type CatalogColorOption = {
  color: string;
  colorHex: string | null;
  image: { url: string; altText: string } | null;
  /** In-stock sizes of this colour, in variant order. */
  sizes: string[];
};

const toColoredImage = (image: { url: string; altText: string; color: string | null }): ColoredImage => ({
  url: image.url,
  altText: image.altText,
  color: image.color,
});

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
  /** One entry per colour, for the card's hover panel: the colour's own
   * first photo (null = use the card's default image) and the sizes that
   * are in stock in that colour. Display data only. */
  colorOptions: CatalogColorOption[];
  /** First colour-less image — what a colour without photos falls back to. */
  sharedImage: { url: string; altText: string } | null;
  /** Aggregate across active variants — see `aggregateStockState`. */
  stockState: StockState;
  /** Live sale campaigns covering this product (price-level first). */
  campaigns: CatalogCampaignInfo[];
};

type ProductRow = { id: string; slug: string; title: string; categorySlug: string; brandId: string | null; categoryId: string };
const refOf = (row: ProductRow): ProductRef => ({ productId: row.id, brandId: row.brandId, categoryId: row.categoryId });

function buildSummary(
  product: { id: string; slug: string; title: string; categorySlug: string },
  variants: CatalogProductVariant[],
  images: ColoredImage[],
  campaigns: CatalogCampaignInfo[] = [],
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

  const colorOptions: CatalogColorOption[] = [];
  for (const variant of variants) {
    let option = colorOptions.find((entry) => entry.color === variant.color);
    if (!option) {
      // Only the colour's own photo; shared images are the card default.
      const own = images.find((image) => image.color === variant.color);
      option = {
        color: variant.color,
        colorHex: variant.colorHex,
        image: own ? { url: own.url, altText: own.altText } : null,
        sizes: [],
      };
      colorOptions.push(option);
    }
    if (variant.stockState !== "out-of-stock" && !option.sizes.includes(variant.size)) option.sizes.push(variant.size);
  }

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    categorySlug: product.categorySlug,
    colorOptions,
    sharedImage: (() => {
      const shared = images.find((image) => image.color === null);
      return shared ? { url: shared.url, altText: shared.altText } : null;
    })(),
    fromPriceToman,
    discountPercent: cheapest ? discountPercent(cheapest.compareAtPriceToman, cheapest.priceToman) : 0,
    colorHexes,
    images: images.map((image) => ({ url: image.url, altText: image.altText })),
    stockState,
    campaigns,
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

async function loadProductSummaries(
  filter: SQL,
  options: { limit?: number; newestFirst?: boolean } = {},
): Promise<CatalogProductSummary[]> {
  const baseQuery = db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      categorySlug: categories.slug,
      brandId: products.brandId,
      categoryId: products.categoryId,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.isActive, true), filter))
    .orderBy(options.newestFirst ? desc(products.createdAt) : asc(products.createdAt));
  const rows = await (options.limit !== undefined ? baseQuery.limit(options.limit) : baseQuery);

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
  const pricing = await getCatalogPricing();

  return rows.map((row) =>
    buildSummary(
      row,
      (variantsByProduct.get(row.id) ?? []).map((variant) => toVariant(variant, pricing, refOf(row))),
      (imagesByProduct.get(row.id) ?? []).map(toColoredImage),
      campaignInfosFor(pricing, refOf(row)),
    ),
  );
}

/** Order statuses whose units count as "sold". `pending_payment` (not yet
 * paid), `cancelled` and `refunded` are deliberately excluded so an
 * abandoned or reversed order can't push a product up the ranking. */
const SALES_COUNTING_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

/**
 * Everything the list pages' filter/sort engine needs about a product, next
 * to the card's `CatalogProductSummary`. Variant prices are the campaign-
 * adjusted ones the card shows (display only — the cart re-prices from the DB).
 */
type CandidateRow = {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  createdAt: Date;
  brandId: string | null;
  brandSlug: string | null;
  brandName: string | null;
  brandNameEn: string | null;
  categoryId: string;
};

const CANDIDATE_COLUMNS = {
  id: products.id,
  slug: products.slug,
  title: products.title,
  categorySlug: categories.slug,
  categoryName: categories.name,
  createdAt: products.createdAt,
  brandId: products.brandId,
  brandSlug: brands.slug,
  brandName: brands.name,
  brandNameEn: brands.nameEn,
  categoryId: products.categoryId,
} as const;

/** Position of every category in the taxonomy (audience > group > type), for a stable facet order. */
const getCategoryOrder = cache(async (): Promise<Map<string, number>> => {
  const flat = flattenCategoryTree(buildCategoryTree(await loadAllCategoryRows()));
  return new Map(flat.map((node, index) => [node.slug, index]));
});

/** Active products matching `where`, joined to their category and (active) brand. */
async function selectCandidateRows(where: SQL | undefined): Promise<CandidateRow[]> {
  return db
    .select(CANDIDATE_COLUMNS)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    // An inactive brand is hidden from the storefront entirely (as on the product page).
    .leftJoin(brands, and(eq(brands.id, products.brandId), eq(brands.isActive, true)))
    .where(and(eq(products.isActive, true), where));
}

/** Two batched queries for N products (no N+1), then one candidate per row, in row order. */
async function assembleCandidates(rows: CandidateRow[]): Promise<ListingCandidate[]> {
  if (rows.length === 0) return [];
  const productIds = rows.map((row) => row.id);
  const [variantRows, imageRows, pricing, categoryOrder] = await Promise.all([
    db
      .select(VARIANT_COLUMNS)
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true))),
    db
      .select(IMAGE_COLUMNS)
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.displayOrder)),
    getCatalogPricing(),
    getCategoryOrder(),
  ]);

  const variantsByProduct = groupByProductId(variantRows);
  const imagesByProduct = groupByProductId(imageRows);

  return rows.map((row) => {
    const variants = (variantsByProduct.get(row.id) ?? []).map((variant) => toVariant(variant, pricing, refOf(row)));
    return {
      summary: buildSummary(
        row,
        variants,
        (imagesByProduct.get(row.id) ?? []).map(toColoredImage),
        campaignInfosFor(pricing, refOf(row)),
      ),
      createdAt: row.createdAt,
      brand: row.brandSlug && row.brandName ? { slug: row.brandSlug, name: row.brandName, nameEn: row.brandNameEn } : null,
      category: { slug: row.categorySlug, name: row.categoryName, order: categoryOrder.get(row.categorySlug) ?? 0 },
      variants: variants.map((variant) => ({
        size: variant.size,
        color: variant.color,
        colorHex: variant.colorHex,
        priceToman: variant.priceToman,
        stock: variant.stock,
      })),
    };
  });
}

/** Candidates for any `where` over active products (collections, campaigns). */
export async function loadListingCandidates(where: SQL | undefined): Promise<ListingCandidate[]> {
  return assembleCandidates(await selectCandidateRows(where));
}

/** Units sold per product (paid-or-later orders only), for the best-selling sort. */
export async function getUnitsSoldByProduct(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const unitsSold = sql<number>`sum(${orderItems.quantity})::int`;
  const rows = await db
    .select({ productId: orderItems.productId, unitsSold })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(inArray(orders.status, [...SALES_COUNTING_STATUSES]), inArray(orderItems.productId, productIds)))
    .groupBy(orderItems.productId);
  const map = new Map<string, number>();
  for (const row of rows) if (row.productId) map.set(row.productId, Number(row.unitsSold));
  return map;
}

/**
 * Filter + sort + page a candidate list. The sales ranking is only fetched when
 * the resolved sort needs it, so the common orderings cost no extra query.
 */
export async function finishListing(params: {
  candidates: ListingCandidate[];
  filters?: ListingFilters;
  defaultSort?: ProductSort;
  page?: number;
  pageSpan?: number;
}) {
  const filters = params.filters ?? EMPTY_LISTING_FILTERS;
  const unitsSold =
    resolveSort(filters, params.defaultSort) === "best-selling"
      ? await getUnitsSoldByProduct(params.candidates.map((candidate) => candidate.summary.id))
      : undefined;
  return runListing({ ...params, filters, unitsSold });
}

/** `limit` is optional: the homepage row asks for one more than it
 * shows (to know whether to render the "show all" tile), while the
 * `/collection/featured` page asks for everything. */
export async function getFeaturedProducts(limit?: number): Promise<CatalogProductSummary[]> {
  return loadProductSummaries(eq(products.isFeatured, true), { limit });
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

/** Newest first, so that a `limit` keeps the most recent products
 * rather than the oldest ones. */
export async function getNewArrivals(limit?: number): Promise<CatalogProductSummary[]> {
  return loadProductSummaries(eq(products.isNewArrival, true), { limit, newestFirst: true });
}


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
async function rankTopSellingIds(limit?: number): Promise<string[]> {
  const unitsSold = sql<number>`sum(${orderItems.quantity})::int`;

  const rankedQuery = db
    .select({ productId: orderItems.productId, unitsSold })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(and(inArray(orders.status, [...SALES_COUNTING_STATUSES]), eq(products.isActive, true)))
    .groupBy(orderItems.productId)
    .orderBy(desc(unitsSold), asc(orderItems.productId));
  const ranked = await (limit !== undefined ? rankedQuery.limit(limit) : rankedQuery);
  return ranked.map((row) => row.productId).filter((id): id is string => id !== null);
}

export async function getTopSellingProducts(limit?: number): Promise<CatalogProductSummary[]> {
  const rankedIds = await rankTopSellingIds(limit);
  if (rankedIds.length === 0) return [];

  // `loadProductSummaries` orders by createdAt; restore the sales ranking.
  const summaries = await loadProductSummaries(inArray(products.id, rankedIds));
  const rankById = new Map(rankedIds.map((id, index) => [id, index]));
  return summaries.sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0));
}

/** The products that have sold, as list-page candidates (the `/collection/top-selling` page). */
export async function getTopSellingCandidates(): Promise<ListingCandidate[]> {
  const rankedIds = await rankTopSellingIds();
  return rankedIds.length === 0 ? [] : loadListingCandidates(inArray(products.id, rankedIds));
}

/** The brand shown on a product page. Only ever present for an **active**
 * brand — a deactivated brand is hidden from the storefront entirely. */
export type CatalogBrand = {
  name: string;
  nameEn: string | null;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  countryOfOrigin: string | null;
};

export type CatalogProductDetail = CatalogProductSummary & {
  /** Every image with its colour scope; the page picks per selected colour
   * (see `gallery.ts`). `images` (from the summary) stays the flat list. */
  galleryImages: Array<{ url: string; altText: string; color: string | null }>;
  /** Public «کد کالا» — shown on the product page and searchable. */
  productCode: number;
  shortDescription: string | null;
  longDescription: string | null;
  brand: CatalogBrand | null;
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
  /** Admin-entered sizing table, or null when the product has none. */
  sizeChart: SizeChart | null;
};

/**
 * If `slug` is a *former* slug of an active product, returns that product's
 * current slug so the page can redirect permanently. Live slugs are always
 * resolved first by `getProductDetailBySlug`, so this only runs on a miss.
 */
export async function getCurrentSlugForFormerSlug(rawSlug: string): Promise<string | null> {
  const [row] = await db
    .select({ slug: products.slug })
    .from(productSlugRedirects)
    .innerJoin(products, eq(products.id, productSlugRedirects.productId))
    .where(and(eq(productSlugRedirects.oldSlug, normalizeSlugParam(rawSlug)), eq(products.isActive, true)))
    .limit(1);
  return row?.slug ?? null;
}

export async function getProductDetailBySlug(rawSlug: string): Promise<CatalogProductDetail | null> {
  const slug = normalizeSlugParam(rawSlug);
  const [row] = await db
    .select({
      id: products.id,
      productCode: products.productCode,
      slug: products.slug,
      title: products.title,
      shortDescription: products.shortDescription,
      longDescription: products.longDescription,
      brandName: brands.name,
      brandNameEn: brands.nameEn,
      brandSlug: brands.slug,
      brandDescription: brands.description,
      brandLogoUrl: brands.logoUrl,
      brandCountryOfOrigin: brands.countryOfOrigin,
      brandIsActive: brands.isActive,
      tags: products.tags,
      seoTitle: products.seoTitle,
      seoDescription: products.seoDescription,
      categoryId: products.categoryId,
      brandId: products.brandId,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(brands, eq(brands.id, products.brandId))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);

  if (!row) return null;

  const categoryTrail = getCategoryTrail(await loadAllCategoryRows(), row.categoryId).map((category) => ({
    slug: category.slug,
    name: category.name,
  }));

  const [variantRows, imageRows, specifications, sizeChart] = await Promise.all([
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
    getProductSizeChart(row.id),
  ]);

  const pricing = await getCatalogPricing();
  const variants = variantRows.map((variant) => toVariant(variant, pricing, refOf(row)));
  const galleryImages = imageRows.map(toColoredImage);
  // Product page shows a single tag: the campaign with the most benefit,
  // judged on the regular (pre-campaign) starting price of the product.
  const referencePrice = variantRows.length > 0 ? Math.min(...variantRows.map((variant) => variant.priceToman)) : 0;
  const summary = buildSummary(row, variants, galleryImages, bestCampaignInfoFor(pricing, refOf(row), referencePrice));

  return {
    ...summary,
    galleryImages,
    productCode: row.productCode,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    brand:
      row.brandIsActive && row.brandName && row.brandSlug
        ? {
            name: row.brandName,
            nameEn: row.brandNameEn,
            slug: row.brandSlug,
            description: row.brandDescription,
            logoUrl: row.brandLogoUrl,
            countryOfOrigin: row.brandCountryOfOrigin,
          }
        : null,
    tags: row.tags,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    categoryName: row.categoryName,
    categoryTrail,
    variants,
    specifications,
    sizeChart,
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
      brandId: products.brandId,
      categoryId: products.categoryId,
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
  const pricing = await getCatalogPricing();

  return rows.map((row) =>
    buildSummary(
      row,
      (variantsByProduct.get(row.id) ?? []).map((variant) => toVariant(variant, pricing, refOf(row))),
      (imagesByProduct.get(row.id) ?? []).map(toColoredImage),
      campaignInfosFor(pricing, refOf(row)),
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
  /** Options for the filter dropdowns (from the whole, unfiltered result set). */
  facets: ListingFacets;
};

export type BrandSuggestion = { name: string; nameEn: string | null; productCount: number };

/**
 * Header-search brand suggestions: **active** brands whose Persian or Latin
 * name contains `q`, that have at least one active product (a brand with
 * nothing to show would lead to an empty results page). Names that start
 * with the query come first. `%`/`_`/`\\` in the query are escaped so they
 * match literally.
 */
export async function searchBrands(q: string, limit = 4): Promise<BrandSuggestion[]> {
  const term = q.trim();
  if (term.length === 0) return [];
  const escaped = term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const contains = `%${escaped}%`;
  const prefix = `${escaped}%`;
  const rows = await db
    .select({
      name: brands.name,
      nameEn: brands.nameEn,
      productCount: sql<number>`count(${products.id})`,
    })
    .from(brands)
    .innerJoin(products, and(eq(products.brandId, brands.id), eq(products.isActive, true)))
    .where(and(eq(brands.isActive, true), or(ilike(brands.name, contains), ilike(brands.nameEn, contains))))
    .groupBy(brands.id)
    .orderBy(
      sql`(${brands.name} ilike ${prefix} or ${brands.nameEn} ilike ${prefix}) desc`,
      asc(brands.displayOrder),
      asc(brands.name),
    )
    .limit(limit);
  return rows.map((row) => ({ ...row, productCount: Number(row.productCount) }));
}

/**
 * Real product search (Phase 5). Plain PostgreSQL `ILIKE` over
 * title/short description/brand (active brands only) — the "sensible PostgreSQL search first"
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
  /** Return this many consecutive pages starting at `page` (default 1) —
   * used to re-render pages 1..N for an infinite-scroll list. */
  pageSpan?: number;
  filters?: ListingFilters;
}): Promise<SearchResult> {
  const q = params.q.trim();

  if (q.length === 0) {
    return { query: q, products: [], total: 0, page: 1, pageSize: SEARCH_PAGE_SIZE, totalPages: 0, facets: EMPTY_FACETS };
  }

  const pattern = `%${q}%`;
  // «کد کالا» lookup: typed in Persian or Latin digits, matched exactly
  // (a prefix match would make "1000" return half the catalog).
  const codeQuery = toLatinDigits(q).replace(/[\s-]/g, "");
  const exactCode = /^\d{1,9}$/.test(codeQuery) ? Number(codeQuery) : null;
  const rows = await selectCandidateRows(
    or(
      exactCode === null ? undefined : eq(products.productCode, exactCode),
      ilike(products.title, pattern),
      ilike(products.shortDescription, pattern),
      // Brand name (Persian or Latin) — an inactive brand is excluded by
      // the join condition, so it never matches.
      ilike(brands.name, pattern),
      ilike(brands.nameEn, pattern),
      // Category name too, so "کفش" or "هودی زنانه" finds products
      // whose own title doesn't repeat the word.
      ilike(categories.name, pattern),
    ),
  );

  const result = await finishListing({
    candidates: await assembleCandidates(rows),
    filters: params.filters,
    page: params.page,
    pageSpan: params.pageSpan,
  });
  return { query: q, pageSize: SEARCH_PAGE_SIZE, ...result };
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
  /** Options for the filter dropdowns: brands, sub-categories, sizes, colours
   * and the price range across *all* of the category's products (before the
   * current filters), so a dropdown never loses its choices once a selection
   * narrows the results. */
  facets: ListingFacets;
};

/**
 * Category listing: browsable, filterable (brand / price / category / size /
 * colour / availability), sortable and paginated product grid for one category.
 *
 * Filtering/sorting/pagination happen in application code after a single
 * batched fetch of the category's products (see `listing-engine.ts`), rather
 * than pushed into SQL. That's the right tradeoff at the catalog's current
 * scale (a handful of products per category) per rule F.1 ("prefer the simplest
 * production-safe solution") — it is *not* the right long-term approach once a
 * category can hold thousands of products, at which point this should move to
 * `WHERE`/`ORDER BY`/`LIMIT ... OFFSET` in the query itself.
 */
export async function getProductsByCategorySlug(params: {
  slug: string;
  page?: number;
  /** Return this many consecutive pages starting at `page` (default 1). */
  pageSpan?: number;
  filters?: ListingFilters;
}): Promise<CategoryProductsResult | null> {
  const resolved = await resolveActiveCategory(params.slug);
  if (!resolved) return null;
  const { detail: category, subtreeIds } = resolved;

  // Audience/group pages list everything beneath them, not just products
  // filed directly on that category (products live on the type level).
  const rows = await selectCandidateRows(inArray(products.categoryId, subtreeIds));
  const result = await finishListing({
    candidates: await assembleCandidates(rows),
    filters: params.filters,
    page: params.page,
    pageSpan: params.pageSpan,
  });
  return { category, pageSize: CATEGORY_PAGE_SIZE, ...result };
}
