import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, productImages, productVariants, products } from "@/lib/db/schema";
import type { Product, ProductImage, ProductVariant } from "@/lib/db/schema";
import { getCategorySubtreeIds } from "@/domains/categories/queries";
import { listProductSpecifications, type SpecificationRow } from "@/domains/catalog/specifications";

/**
 * Admin-facing catalog reads — distinct from
 * `src/domains/catalog/queries.ts` (storefront-facing, filters to active
 * rows only, joins for display). An admin needs to see inactive/
 * out-of-stock/zero-variant products too, in order to fix them.
 */

export type AdminProductListRow = {
  id: string;
  slug: string;
  title: string;
  categoryName: string;
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
  if (search?.trim()) conditions.push(ilike(products.title, `%${search.trim()}%`));
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
        slug: products.slug,
        title: products.title,
        categoryName: categories.name,
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
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .where(where)
      .groupBy(products.id, categories.name)
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
};

export async function getProductForAdmin(id: string): Promise<AdminProductDetail | null> {
  const [product] = await db
    .select({ product: products, categoryName: categories.name })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);
  if (!product) return null;

  const [variants, images, specifications] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.size)),
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.displayOrder)),
    listProductSpecifications(id),
  ]);

  return { ...product.product, categoryName: product.categoryName, variants, images, specifications };
}

export async function isProductSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug));
  if (!existing) return false;
  return !excludeId || existing.id !== excludeId;
}

export async function isVariantSkuTaken(sku: string, excludeId?: string): Promise<boolean> {
  const [existing] = await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.sku, sku));
  if (!existing) return false;
  return !excludeId || existing.id !== excludeId;
}

export async function getVariantForAdmin(id: string): Promise<ProductVariant | null> {
  const [row] = await db.select().from(productVariants).where(eq(productVariants.id, id)).limit(1);
  return row ?? null;
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

export async function listLowStockVariants(): Promise<LowStockRow[]> {
  const rows = await db
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
    .where(and(eq(productVariants.isActive, true), sql`${productVariants.stock} <= ${productVariants.lowStockThreshold}`))
    .orderBy(asc(productVariants.stock));
  return rows;
}
