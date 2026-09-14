import { asc, count, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, products } from "@/lib/db/schema";

/**
 * Admin-facing category reads. Distinct from
 * `src/domains/catalog/queries.ts`'s `getActiveCategories`/
 * `getCategoryBySlug`, which are storefront-facing and deliberately
 * filter to `isActive = true` only — an admin managing the catalog needs
 * to see (and re-activate) inactive categories too, so this is its own
 * small query module rather than adding an `includeInactive` flag to the
 * storefront functions (keeps the storefront query's contract simple and
 * impossible to misuse).
 */

export type AdminCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
};

export async function listCategoriesForAdmin(): Promise<AdminCategoryRow[]> {
  const parent = categories;
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      parentId: categories.parentId,
      displayOrder: categories.displayOrder,
      isActive: categories.isActive,
    })
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name));

  const [parents, productCounts] = await Promise.all([
    db.select({ id: parent.id, name: parent.name }).from(parent),
    db.select({ categoryId: products.categoryId, total: count() }).from(products).groupBy(products.categoryId),
  ]);
  const parentNameById = new Map(parents.map((p) => [p.id, p.name]));
  const productCountById = new Map(productCounts.map((row) => [row.categoryId, Number(row.total)]));

  return rows.map((row) => ({
    ...row,
    parentName: row.parentId ? (parentNameById.get(row.parentId) ?? null) : null,
    productCount: productCountById.get(row.id) ?? 0,
  }));
}

/** For a category-edit form's "parent category" dropdown — excludes the
 * category being edited itself (a category can't be its own parent) and
 * any of its own descendants aren't filtered here (that would need a
 * recursive query); with the catalog's shallow one-level subcategory use
 * case this is an acceptable, documented simplification, not an
 * oversight. */
export async function listCategoryOptions(excludeId?: string): Promise<{ id: string; name: string }[]> {
  const rows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(excludeId ? ne(categories.id, excludeId) : undefined)
    .orderBy(asc(categories.name));
  return rows;
}

export async function getCategoryByIdForAdmin(id: string) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row ?? null;
}

export async function isCategorySlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(excludeId ? ne(categories.id, excludeId) : undefined);
  // Slug uniqueness is enforced by the DB's unique index regardless; this
  // pre-check exists purely to surface a friendly Persian error instead
  // of a raw constraint-violation error bubbling out of a Server Action.
  const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug));
  if (!existing) return false;
  return !excludeId || existing.id !== excludeId;
}

export async function categoryHasChildrenOrProducts(id: string): Promise<boolean> {
  const [child] = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, id)).limit(1);
  if (child) return true;
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.categoryId, id)).limit(1);
  return Boolean(product);
}

export async function listRootCategoryCount(): Promise<number> {
  const rows = await db.select({ id: categories.id }).from(categories).where(isNull(categories.parentId));
  return rows.length;
}
