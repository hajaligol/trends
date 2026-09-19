import { and, count, eq, notInArray } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { categories, products } from "@/lib/db/schema";
import { CATEGORY_TAXONOMY } from "./taxonomy";

/**
 * Database side of the taxonomy in `taxonomy.ts`. Used by:
 * - `npm run db:seed` (fresh dev database), and
 * - `npm run db:sync-categories` (an existing database that already has
 *   categories/products in it — never deletes anything).
 */

export type CategorySyncResult = {
  created: number;
  updated: number;
  unchanged: number;
  /** slug -> id for every taxonomy category, for callers (the seed) that
   * need to attach products right afterwards. */
  idBySlug: Map<string, string>;
};

/**
 * Idempotent upsert of the whole taxonomy, matched by `slug`, in one
 * transaction (a half-applied tree would leave the menu broken).
 *
 * - Missing categories are created.
 * - Existing ones with a taxonomy slug get `name`, `parentId`,
 *   `displayOrder` and `description` set to the taxonomy's values — the
 *   taxonomy file is the source of truth for the structure, so re-running
 *   after editing it converges the database. **`isActive` and `imageUrl`
 *   are never touched**: switching a category off or giving it a picture
 *   in the admin survives a re-sync.
 * - Categories that are *not* in the taxonomy (legacy or admin-created)
 *   are left completely alone. Products are never moved or deleted.
 */
export async function syncCategoryTaxonomy(database: Database): Promise<CategorySyncResult> {
  return database.transaction(async (tx) => {
    const existingRows = await tx.select().from(categories);
    const existingBySlug = new Map(existingRows.map((row) => [row.slug, row]));
    const idBySlug = new Map<string, string>();

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    // `CATEGORY_TAXONOMY` is parent-before-child, so a node's parent id is
    // always known by the time we reach it.
    for (const node of CATEGORY_TAXONOMY) {
      const parentId = node.parentSlug ? (idBySlug.get(node.parentSlug) ?? null) : null;
      if (node.parentSlug && !parentId) {
        throw new Error(`Taxonomy node "${node.slug}" references unknown parent "${node.parentSlug}"`);
      }

      const existing = existingBySlug.get(node.slug);
      if (!existing) {
        const [row] = await tx
          .insert(categories)
          .values({
            slug: node.slug,
            name: node.name,
            description: node.description,
            parentId,
            displayOrder: node.displayOrder,
          })
          .returning({ id: categories.id });
        if (!row) throw new Error(`Failed to insert category "${node.slug}"`);
        idBySlug.set(node.slug, row.id);
        created += 1;
        continue;
      }

      idBySlug.set(node.slug, existing.id);
      const isSame =
        existing.name === node.name &&
        existing.parentId === parentId &&
        existing.displayOrder === node.displayOrder &&
        existing.description === node.description;
      if (isSame) {
        unchanged += 1;
        continue;
      }

      await tx
        .update(categories)
        .set({
          name: node.name,
          description: node.description,
          parentId,
          displayOrder: node.displayOrder,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, existing.id));
      updated += 1;
    }

    return { created, updated, unchanged, idBySlug };
  });
}

export type CategoryAssignmentAudit = {
  /** Categories whose slug is not part of the taxonomy (old flat
   * categories like `shoes`/`hats`, or ones an admin added by hand). */
  outsideTaxonomy: Array<{ slug: string; name: string; productCount: number }>;
  /** Products filed under a category that now has sub-categories (e.g.
   * an old product sitting directly on `men`) — they still show up in
   * that category's listing, but should be moved to a type category. */
  productsOnNonLeafCategory: Array<{ slug: string; title: string; categorySlug: string }>;
};

/**
 * Read-only report of what a sync could not sort out by itself. Deciding
 * that an old "کفش‌ها" product belongs under men's, women's or kids'
 * shoes is a merchandising decision, so the sync lists these instead of
 * guessing.
 */
export async function auditCategoryAssignments(database: Database): Promise<CategoryAssignmentAudit> {
  const taxonomySlugs = new Set(CATEGORY_TAXONOMY.map((node) => node.slug));

  const [categoryRows, productCounts, productRows] = await Promise.all([
    database.select({ id: categories.id, slug: categories.slug, name: categories.name, parentId: categories.parentId }).from(categories),
    database.select({ categoryId: products.categoryId, total: count() }).from(products).groupBy(products.categoryId),
    database.select({ slug: products.slug, title: products.title, categoryId: products.categoryId }).from(products),
  ]);

  const countByCategoryId = new Map(productCounts.map((row) => [row.categoryId, Number(row.total)]));
  const parentIds = new Set(categoryRows.map((row) => row.parentId).filter((id): id is string => id !== null));
  const categoryById = new Map(categoryRows.map((row) => [row.id, row]));

  return {
    outsideTaxonomy: categoryRows
      .filter((row) => !taxonomySlugs.has(row.slug))
      .map((row) => ({ slug: row.slug, name: row.name, productCount: countByCategoryId.get(row.id) ?? 0 })),
    productsOnNonLeafCategory: productRows
      .filter((row) => parentIds.has(row.categoryId))
      .map((row) => ({
        slug: row.slug,
        title: row.title,
        categorySlug: categoryById.get(row.categoryId)?.slug ?? "?",
      })),
  };
}

/**
 * Opt-in cleanup (`npm run db:sync-categories -- --deactivate-outside`):
 * switches **off** every category whose slug is not in the taxonomy, so
 * old flat categories (کفش‌ها، کلاه، ...) stop showing up as extra
 * top-level entries in the menu. Nothing is deleted and no product is
 * moved; re-activate in `/admin/categories` if a category was meant to
 * stay. Returns the slugs it switched off.
 */
export async function deactivateCategoriesOutsideTaxonomy(database: Database): Promise<string[]> {
  const taxonomySlugs = CATEGORY_TAXONOMY.map((node) => node.slug);
  const rows = await database
    .update(categories)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(notInArray(categories.slug, taxonomySlugs), eq(categories.isActive, true)))
    .returning({ slug: categories.slug });
  return rows.map((row) => row.slug);
}
