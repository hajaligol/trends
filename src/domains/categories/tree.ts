/**
 * Pure category-tree helpers — **no database, React or Next imports**, so
 * this file is safe to import from Server Components, Server Actions,
 * scripts and unit tests alike (see `tests/unit/category-tree.test.ts`).
 *
 * The `categories` table stores an adjacency list (`parent_id`). The whole
 * table is tiny (a couple of hundred rows for the full taxonomy in
 * `taxonomy.ts`), so callers load *all* rows in one query and use these
 * helpers to derive the tree, breadcrumb trails and subtree id sets in
 * memory. That is simpler and cheaper than a recursive SQL query per
 * request, and — unlike a recursive CTE — it is trivially unit-testable.
 *
 * Every walk here is guarded against cycles (`parent_id` chains that loop
 * back on themselves). The admin actions refuse to create one (see
 * `validateCategoryParent`), but a hand-edited row or a future bug must
 * not be able to hang a page render in an infinite loop.
 */

/** Deepest allowed nesting: audience (1) > group (2) > type (3). The
 * storefront menus render exactly this many levels, so admin edits are
 * not allowed to go deeper. */
export const MAX_CATEGORY_DEPTH = 3;

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type CategoryNode = CategoryRow & {
  /** 1 = root/audience, 2 = group, 3 = type. */
  depth: number;
  children: CategoryNode[];
};

function compareSiblings(a: CategoryRow, b: CategoryRow): number {
  if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
  return a.name.localeCompare(b.name, "fa");
}

/**
 * Builds the forest of root categories from flat rows.
 *
 * With `activeOnly`, an inactive category hides its **entire subtree** —
 * switching off "بچگانه" in the admin must also switch off everything
 * beneath it, even though the child rows are individually still active.
 * Rows caught in a parent cycle are unreachable from any root and are
 * simply not returned.
 */
export function buildCategoryTree(rows: CategoryRow[], options: { activeOnly?: boolean } = {}): CategoryNode[] {
  const childrenByParent = new Map<string | null, CategoryRow[]>();
  for (const row of rows) {
    const bucket = childrenByParent.get(row.parentId);
    if (bucket) bucket.push(row);
    else childrenByParent.set(row.parentId, [row]);
  }

  const visited = new Set<string>();

  const build = (row: CategoryRow, depth: number): CategoryNode | null => {
    if (visited.has(row.id)) return null;
    if (options.activeOnly && !row.isActive) return null;
    visited.add(row.id);

    const children: CategoryNode[] = [];
    for (const child of [...(childrenByParent.get(row.id) ?? [])].sort(compareSiblings)) {
      const node = build(child, depth + 1);
      if (node) children.push(node);
    }
    return { ...row, depth, children };
  };

  const roots: CategoryNode[] = [];
  for (const row of [...(childrenByParent.get(null) ?? [])].sort(compareSiblings)) {
    const node = build(row, 1);
    if (node) roots.push(node);
  }
  return roots;
}

/** Depth-first, parent-before-children flattening (menu/table order). */
export function flattenCategoryTree(roots: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (node: CategoryNode) => {
    out.push(node);
    node.children.forEach(walk);
  };
  roots.forEach(walk);
  return out;
}

/**
 * Ids of `rootId` and everything beneath it, computed from any flat list
 * carrying `id`/`parentId` (the admin category pickers, which have no
 * tree). Cycle-safe.
 */
export function collectDescendantIdsFromFlat(items: Array<{ id: string; parentId: string | null }>, rootId: string): Set<string> {
  const collected = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of items) {
      if (item.parentId && collected.has(item.parentId) && !collected.has(item.id)) {
        collected.add(item.id);
        grew = true;
      }
    }
  }
  return collected;
}

/** Id of `node` plus every descendant id (for `WHERE category_id IN (...)`). */
export function collectSubtreeIds(node: CategoryNode): string[] {
  return flattenCategoryTree([node]).map((n) => n.id);
}

/** Root-to-node path (the node itself last) for `slug`, or `null`. */
export function findCategoryPath(roots: CategoryNode[], slug: string): CategoryNode[] | null {
  const walk = (node: CategoryNode, path: CategoryNode[]): CategoryNode[] | null => {
    const here = [...path, node];
    if (node.slug === slug) return here;
    for (const child of node.children) {
      const found = walk(child, here);
      if (found) return found;
    }
    return null;
  };
  for (const root of roots) {
    const found = walk(root, []);
    if (found) return found;
  }
  return null;
}

export function findNodeBySlug(roots: CategoryNode[], slug: string): CategoryNode | null {
  return flattenCategoryTree(roots).find((node) => node.slug === slug) ?? null;
}

export function findNodeById(roots: CategoryNode[], id: string): CategoryNode | null {
  return flattenCategoryTree(roots).find((node) => node.id === id) ?? null;
}

/**
 * Ancestor chain for `id`, **root first, the category itself last**.
 * Works on flat rows (not the pruned active tree) so a product page can
 * still show a complete breadcrumb even if a category was later switched
 * off. Stops at a missing parent or a cycle instead of looping.
 */
export function getCategoryTrail<T extends Pick<CategoryRow, "id" | "parentId">>(rows: T[], id: string): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const trail: T[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    trail.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return trail;
}

/** "مردانه › لباس مردانه › پیراهن مردانه" — for admin pickers/tables. */
export const CATEGORY_PATH_SEPARATOR = " › ";

export function categoryPathLabel(trail: Array<Pick<CategoryRow, "name">>): string {
  return trail.map((row) => row.name).join(CATEGORY_PATH_SEPARATOR);
}

/** How many levels the subtree rooted at `id` spans (a leaf spans 1). */
function subtreeHeight(rows: CategoryRow[], id: string, seen = new Set<string>()): number {
  if (seen.has(id)) return 0;
  seen.add(id);
  let tallestChild = 0;
  for (const row of rows) {
    if (row.parentId === id) tallestChild = Math.max(tallestChild, subtreeHeight(rows, row.id, seen));
  }
  return 1 + tallestChild;
}

export type ParentValidationError = "missing-parent" | "self" | "descendant" | "too-deep";

/**
 * Server-side guard for creating/moving a category under `newParentId`
 * (`null` = make it a root). `categoryId` is `null` when creating.
 *
 * - `self` / `descendant`: would create a cycle.
 * - `too-deep`: the category (and, when moving, everything under it)
 *   would end up deeper than `MAX_CATEGORY_DEPTH`.
 */
export function validateCategoryParent(
  rows: CategoryRow[],
  categoryId: string | null,
  newParentId: string | null,
): ParentValidationError | null {
  if (newParentId === null) return null;
  if (!rows.some((row) => row.id === newParentId)) return "missing-parent";
  if (categoryId !== null && newParentId === categoryId) return "self";

  const parentTrail = getCategoryTrail(rows, newParentId);
  if (categoryId !== null && parentTrail.some((row) => row.id === categoryId)) return "descendant";

  const ownHeight = categoryId === null ? 1 : subtreeHeight(rows, categoryId);
  if (parentTrail.length + ownHeight > MAX_CATEGORY_DEPTH) return "too-deep";

  return null;
}

export const PARENT_VALIDATION_MESSAGES: Record<ParentValidationError, string> = {
  "missing-parent": "دسته والد یافت نشد",
  self: "یک دسته نمی‌تواند والد خودش باشد",
  descendant: "یک دسته نمی‌تواند زیر یکی از زیردسته‌های خودش قرار بگیرد",
  "too-deep": "دسته‌بندی‌ها حداکثر سه سطح دارند (مخاطب › گروه › نوع)",
};

/**
 * Lean, serializable shape of the tree for navigation UI. Only what the
 * header/footer menus render (`slug`, `name`, `children`) — no ids,
 * images or descriptions — because the whole tree is passed as props to
 * a Client Component on every page.
 */
export type NavCategory = {
  slug: string;
  name: string;
  children: NavCategory[];
};

export function toNavTree(nodes: CategoryNode[]): NavCategory[] {
  return nodes.map((node) => ({ slug: node.slug, name: node.name, children: toNavTree(node.children) }));
}
