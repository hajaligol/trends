import { normalizeSearchText, textIncludes, type RawParam } from "@/lib/utils/admin-filters";
import type { AdminCategoryRow } from "./queries";

/**
 * In-memory filter for `/admin/categories`. The list is a tree in
 * depth-first order and the page groups rows under their level-1 row, so a
 * matching row must keep its ancestors or its group would have no header.
 * `filterCategoryRows` therefore returns the matches **plus their ancestors**
 * (in the original tree order) and reports which rows are only there for
 * context.
 */

export type CategoryListFilter = {
  q?: string;
  status?: "active" | "inactive";
  /** 1 = مخاطب, 2 = گروه, 3 = نوع. */
  level?: 1 | 2 | 3;
  products?: "with" | "without";
};

export function parseCategoryFilter(raw: { q?: RawParam; status?: RawParam; level?: RawParam; products?: RawParam }): CategoryListFilter {
  const one = (value: RawParam) => (Array.isArray(value) ? value[0] : value);
  const level = one(raw.level);
  return {
    q: normalizeSearchText(raw.q),
    status: one(raw.status) === "active" ? "active" : one(raw.status) === "inactive" ? "inactive" : undefined,
    level: level === "1" ? 1 : level === "2" ? 2 : level === "3" ? 3 : undefined,
    products: one(raw.products) === "with" ? "with" : one(raw.products) === "without" ? "without" : undefined,
  };
}

export function isCategoryFilterActive(filter: CategoryListFilter): boolean {
  return Boolean(filter.q || filter.status || filter.level || filter.products);
}

export function categoryMatches(row: AdminCategoryRow, filter: CategoryListFilter): boolean {
  if (filter.status && row.isActive !== (filter.status === "active")) return false;
  if (filter.level && row.depth !== filter.level) return false;
  // "Has products" means anywhere beneath it, which is the number the page shows.
  if (filter.products === "with" && row.subtreeProductCount === 0) return false;
  if (filter.products === "without" && row.subtreeProductCount > 0) return false;
  if (filter.q) {
    const hit = textIncludes(row.name, filter.q) || textIncludes(row.slug, filter.q) || textIncludes(row.parentName, filter.q);
    if (!hit) return false;
  }
  return true;
}

export type FilteredCategories = {
  rows: AdminCategoryRow[];
  /** Ids of rows included only because a descendant matched. */
  contextIds: Set<string>;
  matchCount: number;
};

export function filterCategoryRows(rows: AdminCategoryRow[], filter: CategoryListFilter): FilteredCategories {
  if (!isCategoryFilterActive(filter)) return { rows, contextIds: new Set(), matchCount: rows.length };

  const byId = new Map(rows.map((row) => [row.id, row]));
  const matched = new Set(rows.filter((row) => categoryMatches(row, filter)).map((row) => row.id));
  const keep = new Set(matched);
  for (const id of matched) {
    // Walk up; the visited guard protects against a parent cycle in bad data.
    const seen = new Set<string>([id]);
    let parentId = byId.get(id)?.parentId ?? null;
    while (parentId && !seen.has(parentId) && byId.has(parentId)) {
      keep.add(parentId);
      seen.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  }
  const contextIds = new Set([...keep].filter((id) => !matched.has(id)));
  return { rows: rows.filter((row) => keep.has(row.id)), contextIds, matchCount: matched.size };
}
