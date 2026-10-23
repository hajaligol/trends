import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { toLatinDigits } from "@/lib/utils/digits";
import { containsPattern } from "@/lib/utils/admin-filters";
import { db } from "@/lib/db/client";
import { brands, categories, productImages, productVariants, products } from "@/lib/db/schema";
import type { Product, ProductImage, ProductVariant } from "@/lib/db/schema";
import { getCategorySubtreeIds } from "@/domains/categories/queries";
import { listProductSpecifications, type SpecificationRow } from "@/domains/catalog/specifications";
import { getProductSizeChart, type SizeChart } from "@/domains/catalog/size-chart";

/**
 * Admin-facing catalog reads — distinct from
 * `src/domains/catalog/queries.ts` (storefront-facing, filters to active
 * rows only, joins for display). An admin needs to see inactive/
 * out-of-stock/zero-variant products too, in order to fix them.
 */

export type AdminProductListRow = {
  id: string;
  productCode: number;
  slug: string;
  title: string;
  categoryName: string;
  brandName: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  variantCount: number;
  totalStock: number;
  minPriceToman: number | null;
  /** Primary (or first) gallery image, for the list thumbnail. */
  imageUrl: string | null;
};

export type AdminProductListFilter = {
  search?: string;
  categoryId?: string;
  /** `true` = only active, `false` = only inactive, omitted = all. */
  isActive?: boolean;
  page?: number;
  pageSize?: number;
};

export type AdminProductListPage = {
  rows: AdminProductListRow[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listProductsForAdmin({
  search,
  categoryId,
  isActive,
  page = 1,
  pageSize = 20,
}: AdminProductListFilter = {}): Promise<AdminProductListPage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const conditions = [];
  const term = search?.trim();
  if (term) {
    // Title, «کد کالا» (digits in Persian or Latin; prefix match so a
    // partial code narrows the list) and any variant SKU.
    const digits = toLatinDigits(term).replace(/[\s-]/g, "");
    const escaped = term.replace(/[\\%_]/g, (char) => `\\${char}`);
    conditions.push(
      or(
        ilike(products.title, `%${escaped}%`),
        /^\d+$/.test(digits) ? sql`cast(${products.productCode} as text) like ${`${digits}%`}` : undefined,
        sql`exists (select 1 from ${productVariants} pv where pv.product_id = ${products.id} and pv.sku ilike ${`%${escaped}%`})`,
      )!,
    );
  }
  if (categoryId) {
    // Filtering by an audience or group includes everything beneath it;
    // an unknown/garbage id matches nothing instead of erroring.
    const subtreeIds = await getCategorySubtreeIds(categoryId);
    conditions.push(subtreeIds.length > 0 ? inArray(products.categoryId, subtreeIds) : sql`false`);
  }
  if (isActive !== undefined) conditions.push(eq(products.isActive, isActive));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: products.id,
        productCode: products.productCode,
        slug: products.slug,
        title: products.title,
        categoryName: categories.name,
        brandName: brands.name,
        isActive: products.isActive,
        isFeatured: products.isFeatured,
        isNewArrival: products.isNewArrival,
        variantCount: sql<number>`count(distinct ${productVariants.id})`,
        totalStock: sql<number>`coalesce(sum(${productVariants.stock}), 0)`,
        minPriceToman: sql<number | null>`min(${productVariants.priceToman})`,
        // One scalar subquery per page row (page size ≤ 100), served by
        // the `product_images.product_id` index — not an N+1 from app code.
        imageUrl: sql<string | null>`(select ${productImages.url} from ${productImages} where ${productImages.productId} = ${products.id} order by ${productImages.isPrimary} desc, ${productImages.displayOrder} asc limit 1)`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .where(where)
      .groupBy(products.id, categories.name, brands.name)
      .orderBy(desc(products.updatedAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    // Real `COUNT(*)` (Phase 13 query-review fix) instead of selecting
    // every matching product's id just to take `.length`.
    db.select({ total: count() }).from(products).where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      ...row,
      variantCount: Number(row.variantCount),
      totalStock: Number(row.totalStock),
      minPriceToman: row.minPriceToman === null ? null : Number(row.minPriceToman),
    })),
    page: safePage,
    pageSize: safePageSize,
    total: totalRows[0]?.total ?? 0,
  };
}

export type AdminProductDetail = Product & {
  categoryName: string;
  variants: ProductVariant[];
  images: ProductImage[];
  /** Custom «مشخصات محصول» rows, in display order. */
  specifications: SpecificationRow[];
  sizeChart: SizeChart | null;
};

export async function getProductForAdmin(id: string): Promise<AdminProductDetail | null> {
  const [product] = await db
    .select({ product: products, categoryName: categories.name })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);
  if (!product) return null;

  const [variants, images, specifications, sizeChart] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.size)),
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.displayOrder)),
    listProductSpecifications(id),
    getProductSizeChart(id),
  ]);

  return { ...product.product, categoryName: product.categoryName, variants, images, specifications, sizeChart };
}




/** Every active variant at or below its own low-stock threshold, across
 * every product — the admin "Inventory" page's core read
 * (TRENDS_PROJECT_CONTEXT.md §6 "low-stock threshold"). */
export type LowStockRow = {
  variantId: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  lowStockThreshold: number;
};



/* ------------------------------------------------------------------ */
/* Inventory screen: every variant, filterable                         */
/* ------------------------------------------------------------------ */

export type StockState = "low" | "out" | "in";

export type StockListFilter = {
  /** Product title / SKU / size / color / product code (already normalised). */
  q?: string;
  /** `low` = in stock but at/below its own threshold, `out` = 0, `in` = above threshold. */
  stock?: StockState;
  brandId?: string;
  /** Includes everything beneath the category. */
  categoryId?: string;
  page?: number;
  pageSize?: number;
};

export type StockListPage = {
  rows: LowStockRow[];
  page: number;
  pageSize: number;
  /** Rows matching every filter. */
  total: number;
  /** Counts for the stock-state tabs: every filter except `stock`. */
  counts: { all: number; low: number; out: number; in: number };
};

/**
 * Active variants with their stock, for `/admin/inventory`. Replaces the old
 * "low stock only" list: the same rows come first (ordered by stock
 * ascending), but an operator can now search any variant and filter by
 * stock state, brand and category. Filtering and paging happen in SQL.
 */
export async function listVariantStockForAdmin({
  q,
  stock,
  brandId,
  categoryId,
  page = 1,
  pageSize = 20,
}: StockListFilter = {}): Promise<StockListPage> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const categoryIds = categoryId ? await getCategorySubtreeIds(categoryId) : undefined;

  const base = [
    eq(productVariants.isActive, true),
    brandId ? eq(products.brandId, brandId) : undefined,
    // A category id that doesn't exist yields an empty subtree → no rows.
    categoryIds ? (categoryIds.length > 0 ? inArray(products.categoryId, categoryIds) : sql`false`) : undefined,
    q
      ? or(
          ilike(products.title, containsPattern(q)),
          ilike(productVariants.sku, containsPattern(q)),
          ilike(productVariants.size, containsPattern(q)),
          ilike(productVariants.color, containsPattern(q)),
          /^\d{1,9}$/.test(q) ? sql`${products.productCode} = ${Number(q)}` : undefined,
        )
      : undefined,
  ];

  const stockClause = {
    out: sql`${productVariants.stock} = 0`,
    low: sql`${productVariants.stock} > 0 AND ${productVariants.stock} <= ${productVariants.lowStockThreshold}`,
    in: sql`${productVariants.stock} > ${productVariants.lowStockThreshold}`,
  } satisfies Record<StockState, ReturnType<typeof sql>>;

  const where = and(...base, stock ? stockClause[stock] : undefined);

  const [rows, totals] = await Promise.all([
    db
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productTitle: products.title,
        productSlug: products.slug,
        sku: productVariants.sku,
        size: productVariants.size,
        color: productVariants.color,
        stock: productVariants.stock,
        lowStockThreshold: productVariants.lowStockThreshold,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(where)
      // Lowest stock first (out-of-stock on top), then stable by title/sku.
      .orderBy(asc(productVariants.stock), asc(products.title), asc(productVariants.sku))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    db
      .select({
        all: count(),
        out: sql<number>`count(*) filter (where ${stockClause.out})::int`,
        low: sql<number>`count(*) filter (where ${stockClause.low})::int`,
        in: sql<number>`count(*) filter (where ${stockClause.in})::int`,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(and(...base)),
  ]);

  const counts = totals[0] ?? { all: 0, out: 0, low: 0, in: 0 };
  const total = stock ? counts[stock] : counts.all;
  return { rows, page: safePage, pageSize: safePageSize, total, counts: { all: counts.all, low: counts.low, out: counts.out, in: counts.in } };
}
