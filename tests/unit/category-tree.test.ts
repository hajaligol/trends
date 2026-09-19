import { describe, expect, it } from "vitest";
import {
  buildCategoryTree,
  categoryPathLabel,
  collectDescendantIdsFromFlat,
  collectSubtreeIds,
  findCategoryPath,
  flattenCategoryTree,
  getCategoryTrail,
  toNavTree,
  validateCategoryParent,
  type CategoryRow,
} from "@/domains/categories/tree";

function row(id: string, parentId: string | null, overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id,
    slug: id,
    name: id,
    description: null,
    imageUrl: null,
    parentId,
    displayOrder: 0,
    isActive: true,
    ...overrides,
  };
}

// men > (men-clothing > (shirts, pants), men-shoes > (sneakers)), women
const rows: CategoryRow[] = [
  row("men", null, { displayOrder: 0 }),
  row("women", null, { displayOrder: 1 }),
  row("men-clothing", "men", { displayOrder: 0 }),
  row("men-shoes", "men", { displayOrder: 1 }),
  row("shirts", "men-clothing", { displayOrder: 0 }),
  row("pants", "men-clothing", { displayOrder: 1 }),
  row("sneakers", "men-shoes", { displayOrder: 0 }),
];

describe("buildCategoryTree", () => {
  it("nests children under parents and numbers depths from 1", () => {
    const tree = buildCategoryTree(rows);
    expect(tree.map((node) => node.id)).toEqual(["men", "women"]);
    const men = tree[0]!;
    expect(men.depth).toBe(1);
    expect(men.children.map((node) => node.id)).toEqual(["men-clothing", "men-shoes"]);
    expect(men.children[0]!.depth).toBe(2);
    expect(men.children[0]!.children.map((node) => [node.id, node.depth])).toEqual([
      ["shirts", 3],
      ["pants", 3],
    ]);
  });

  it("orders siblings by displayOrder, not input order", () => {
    const shuffled = [...rows].reverse();
    expect(buildCategoryTree(shuffled).map((node) => node.id)).toEqual(["men", "women"]);
    expect(buildCategoryTree(shuffled)[0]!.children.map((node) => node.id)).toEqual(["men-clothing", "men-shoes"]);
  });

  it("breaks displayOrder ties by name", () => {
    const tied = [row("b", null, { name: "ب" }), row("a", null, { name: "الف" })];
    expect(buildCategoryTree(tied).map((node) => node.id)).toEqual(["a", "b"]);
  });

  it("with activeOnly, an inactive category hides its whole branch", () => {
    const withInactiveGroup = rows.map((r) => (r.id === "men-clothing" ? { ...r, isActive: false } : r));
    const ids = flattenCategoryTree(buildCategoryTree(withInactiveGroup, { activeOnly: true })).map((n) => n.id);
    expect(ids).toEqual(["men", "men-shoes", "sneakers", "women"]);
    // ...even though the children are individually still active.
    expect(ids).not.toContain("shirts");
    // Without the flag everything is still there (admin view).
    expect(flattenCategoryTree(buildCategoryTree(withInactiveGroup))).toHaveLength(rows.length);
  });

  it("does not loop forever on a parent cycle; cyclic rows are just unreachable", () => {
    const cyclic = [row("root", null), row("a", "b"), row("b", "a")];
    expect(flattenCategoryTree(buildCategoryTree(cyclic)).map((n) => n.id)).toEqual(["root"]);
  });
});

describe("tree navigation helpers", () => {
  const tree = buildCategoryTree(rows);

  it("flattens depth-first, parent before children", () => {
    expect(flattenCategoryTree(tree).map((n) => n.id)).toEqual([
      "men",
      "men-clothing",
      "shirts",
      "pants",
      "men-shoes",
      "sneakers",
      "women",
    ]);
  });

  it("collects a node and every descendant id (what a listing page filters on)", () => {
    const men = tree[0]!;
    expect(collectSubtreeIds(men).sort()).toEqual(
      ["men", "men-clothing", "shirts", "pants", "men-shoes", "sneakers"].sort(),
    );
    expect(collectSubtreeIds(men.children[0]!.children[0]!)).toEqual(["shirts"]);
  });

  it("finds the root-to-node path by slug", () => {
    expect(findCategoryPath(tree, "pants")!.map((n) => n.id)).toEqual(["men", "men-clothing", "pants"]);
    expect(findCategoryPath(tree, "women")!.map((n) => n.id)).toEqual(["women"]);
    expect(findCategoryPath(tree, "nope")).toBeNull();
  });

  it("builds a breadcrumb trail root-first from flat rows, including inactive ancestors", () => {
    const inactive = rows.map((r) => (r.id === "men-clothing" ? { ...r, isActive: false } : r));
    expect(getCategoryTrail(inactive, "shirts").map((r) => r.id)).toEqual(["men", "men-clothing", "shirts"]);
    expect(getCategoryTrail(rows, "missing")).toEqual([]);
  });

  it("stops a trail walk at a cycle instead of hanging", () => {
    const cyclic = [row("a", "b"), row("b", "a")];
    expect(getCategoryTrail(cyclic, "a").length).toBeLessThanOrEqual(2);
  });

  it("formats an admin path label", () => {
    const trail = getCategoryTrail(
      rows.map((r) => ({ ...r, name: r.id.toUpperCase() })),
      "shirts",
    );
    expect(categoryPathLabel(trail)).toBe("MEN › MEN-CLOTHING › SHIRTS");
  });

  it("collects descendants from a flat list (admin parent picker)", () => {
    expect([...collectDescendantIdsFromFlat(rows, "men-clothing")].sort()).toEqual(
      ["men-clothing", "pants", "shirts"].sort(),
    );
    expect([...collectDescendantIdsFromFlat(rows, "sneakers")]).toEqual(["sneakers"]);
  });

  it("strips the tree down to the serializable nav shape", () => {
    const nav = toNavTree(tree);
    expect(nav[0]).toEqual({
      slug: "men",
      name: "men",
      children: [
        { slug: "men-clothing", name: "men-clothing", children: [
          { slug: "shirts", name: "shirts", children: [] },
          { slug: "pants", name: "pants", children: [] },
        ] },
        { slug: "men-shoes", name: "men-shoes", children: [{ slug: "sneakers", name: "sneakers", children: [] }] },
      ],
    });
    expect(Object.keys(nav[0]!).sort()).toEqual(["children", "name", "slug"]);
  });
});

describe("validateCategoryParent", () => {
  it("allows a root (no parent) and a normal move", () => {
    expect(validateCategoryParent(rows, "shirts", null)).toBeNull();
    expect(validateCategoryParent(rows, "shirts", "men-shoes")).toBeNull();
  });

  it("allows creating a new category under a group, but not under a type (would be level 4)", () => {
    expect(validateCategoryParent(rows, null, "men-clothing")).toBeNull();
    expect(validateCategoryParent(rows, null, "men")).toBeNull();
    expect(validateCategoryParent(rows, null, "shirts")).toBe("too-deep");
  });

  it("rejects an unknown parent", () => {
    expect(validateCategoryParent(rows, null, "ghost")).toBe("missing-parent");
  });

  it("rejects a category as its own parent", () => {
    expect(validateCategoryParent(rows, "men", "men")).toBe("self");
  });

  it("rejects moving a category under its own descendant (cycle)", () => {
    expect(validateCategoryParent(rows, "men", "shirts")).toBe("descendant");
    expect(validateCategoryParent(rows, "men-clothing", "pants")).toBe("descendant");
  });

  it("rejects a move that pushes the moved subtree past three levels", () => {
    // men-clothing has 2 levels (itself + types); under a group (depth 2) it would reach depth 4.
    expect(validateCategoryParent(rows, "men-clothing", "men-shoes")).toBe("too-deep");
    // ...but a leaf can move under a group fine, and a whole group can move under another audience.
    expect(validateCategoryParent(rows, "men-clothing", "women")).toBeNull();
  });
});
