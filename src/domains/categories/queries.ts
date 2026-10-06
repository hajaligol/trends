import { count, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, products } from "@/lib/db/schema";
import {
  buildCategoryTree,
  categoryPathLabel,
  collectSubtreeIds,
  findNodeById,
  flattenCategoryTree,
  getCategoryTrail,
  type CategoryNode,
  type CategoryRow,
} from "./tree";

/**
 * Admin-facing category reads. Distinct from
 * `src/domains/catalog/queries.ts`'s `getCategoryTree`/
 * `getCategoryBySlug`, which are storefront-facing and deliberately
 * filter to active categories only — an admin managing the catalog needs
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
  imageUrl: string | null;
  parentId: string | null;
  parentName: string | null;
  displayOrder: number;
  isActive: boolean;
  /** 1 = audience, 2 = group, 3 = type — drives the indentation in the
   * admin table. */
  depth: number;
  /** Products filed directly on this category. */
  productCount: number;
  /** Products on this category **and everything beneath it** — for an
   * audience/group row, the own count is always 0 (products live on the
   * type level), so this is the number that means something there. */
  subtreeProductCount: number;
};

/** All rows (active or not) — the admin needs to see and re-activate
 * inactive categories too. */
async function loadAllRowsForAdmin(): Promise<CategoryRow[]> {
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
}

/**
 * The full category list in **tree order** (each parent immediately
 * followed by its children, depth-first), so the admin table reads as an
 * outline: مردانه > لباس مردانه > پیراهن مردانه ...
 */
export async function listCategoriesForAdmin(): Promise<AdminCategoryRow[]> {
  const [rows, productCounts] = await Promise.all([
    loadAllRowsForAdmin(),
    db.select({ categoryId: products.categoryId, total: count() }).from(products).groupBy(products.categoryId),
  ]);
  const ownCountById = new Map(productCounts.map((row) => [row.categoryId, Number(row.total)]));
  const nameById = new Map(rows.map((row) => [row.id, row.name]));

  const roots = buildCategoryTree(rows);
  const subtreeCountById = new Map<string, number>();
  const tally = (node: CategoryNode): number => {
    const total = (ownCountById.get(node.id) ?? 0) + node.children.reduce((sum, child) => sum + tally(child), 0);
    subtreeCountById.set(node.id, total);
    return total;
  };
  roots.forEach(tally);

  const ordered: Array<{ row: CategoryRow; depth: number }> = flattenCategoryTree(roots).map((node) => ({
    row: node,
    depth: node.depth,
  }));
  // Rows caught in a parent cycle never appear in the tree; list them at
  // the end (as roots) rather than hiding them from the admin who could
  // fix them.
  const seen = new Set(ordered.map((entry) => entry.row.id));
  for (const row of rows) {
    if (!seen.has(row.id)) ordered.push({ row, depth: 1 });
  }

  return ordered.map(({ row, depth }) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    parentId: row.parentId,
    parentName: row.parentId ? (nameById.get(row.parentId) ?? null) : null,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    depth,
    productCount: ownCountById.get(row.id) ?? 0,
    subtreeProductCount: subtreeCountById.get(row.id) ?? ownCountById.get(row.id) ?? 0,
  }));
}

export type CategoryOption = {
  id: string;
  /** Full path label, e.g. "مردانه › لباس مردانه › پیراهن مردانه". */
  name: string;
  parentId: string | null;
  depth: number;
  /** Path label of the parent — used as the `<optgroup>` label in the
   * product form's category picker. */
  group: string | null;
};

/**
 * Every category as a picker option, in tree order, labelled with its full
 * path. Used for the category form's "parent" dropdown and the admin
 * product list's category filter. Callers that must exclude a category
 * and its descendants (the parent picker on the edit form) do it
 * client-side from `parentId`, so this single list can be shared by every
 * row instead of being recomputed per row.
 */
export async function listCategoryOptions(): Promise<CategoryOption[]> {
  const rows = await loadAllRowsForAdmin();
  const flat = flattenCategoryTree(buildCategoryTree(rows));
  return flat.map((node) => {
    const trail = getCategoryTrail(rows, node.id);
    return {
      id: node.id,
      name: categoryPathLabel(trail),
      parentId: node.parentId,
      depth: node.depth,
      group: trail.length > 1 ? categoryPathLabel(trail.slice(0, -1)) : null,
    };
  });
}

/**
 * The categories a product may be filed under: **leaves only** (no
 * sub-categories), in tree order, labelled with their full path and
 * grouped by parent. Inactive leaves are listed too (marked) so an
 * existing product in a switched-off category still shows its current
 * value in the form.
 */
export async function listLeafCategoryOptions(): Promise<CategoryOption[]> {
  const rows = await loadAllRowsForAdmin();
  const parentIds = new Set(rows.map((row) => row.parentId).filter((id): id is string => id !== null));
  const flat = flattenCategoryTree(buildCategoryTree(rows));
  return flat
    .filter((node) => !parentIds.has(node.id))
    .map((node) => {
      const trail = getCategoryTrail(rows, node.id);
      return {
        id: node.id,
        name: categoryPathLabel(trail) + (node.isActive ? "" : " (غیرفعال)"),
        parentId: node.parentId,
        depth: node.depth,
        group: trail.length > 1 ? categoryPathLabel(trail.slice(0, -1)) : null,
      };
    });
}

export type CategoryPickerNode = {
  id: string;
  name: string;
  parentId: string | null;
  /** 1 = gender/audience, 2 = group, 3 = type. */
  depth: number;
  isActive: boolean;
};

/**
 * The whole tree as a flat, tree-ordered list for the product form's three
 * linked dropdowns (gender → group → type). The table is a couple of
 * hundred rows, so the client receives it once and filters locally.
 */
export async function listCategoryPickerNodes(): Promise<CategoryPickerNode[]> {
  const rows = await loadAllRowsForAdmin();
  return flattenCategoryTree(buildCategoryTree(rows)).map((node) => ({
    id: node.id,
    name: node.name,
    parentId: node.parentId,
    depth: node.depth,
    isActive: node.isActive,
  }));
}

/** Id of the category plus all its descendants (`[]` if it doesn't exist),
 * for filtering products by an audience/group/type in the admin. */
export async function getCategorySubtreeIds(categoryId: string): Promise<string[]> {
  const node = findNodeById(buildCategoryTree(await loadAllRowsForAdmin()), categoryId);
  return node ? collectSubtreeIds(node) : [];
}

/**
 * Server-side rule for the product form: a product must be filed under an
 * existing **leaf** category. Returns a Persian error message, or `null`
 * when the choice is fine.
 */
export async function getProductCategoryError(categoryId: string): Promise<string | null> {
  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!category) return "دسته انتخاب‌شده یافت نشد";
  const [child] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, categoryId))
    .limit(1);
  if (child) return "محصول باید در یک دسته نهایی (زیردسته) قرار بگیرد، نه در دسته اصلی یا گروه";
  return null;
}

/** Flat rows for `validateCategoryParent` in the category actions. */
export async function loadCategoryRowsForValidation(): Promise<CategoryRow[]> {
  return loadAllRowsForAdmin();
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
  // A real `COUNT(*)` (Phase 13 query-review fix) — the previous
  // `SELECT id ... ; rows.length` shape transferred every matching row's
  // id just to count them, which scales with table size for no reason.
  const [row] = await db.select({ total: count() }).from(categories).where(isNull(categories.parentId));
  return row?.total ?? 0;
}
