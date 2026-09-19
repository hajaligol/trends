import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, products } from "@/lib/db/schema";
import { CATEGORY_TAXONOMY } from "@/domains/categories/taxonomy";
import { auditCategoryAssignments, syncCategoryTaxonomy } from "@/domains/categories/sync";
import { getProductCategoryError } from "@/domains/categories/queries";
import {
  getCategoryBySlug,
  getCategoryTree,
  getProductsByCategorySlug,
  getRelatedProducts,
  getRootCategories,
  searchProducts,
} from "@/domains/catalog/queries";
import { createTestProductWithVariant } from "./helpers";

/**
 * The three-level category tree against a real PostgreSQL database:
 * taxonomy sync, tree-aware listings (a parent page shows everything
 * beneath it), storefront visibility rules, the "products live on leaf
 * categories" rule and the database-level self-parent guard.
 *
 * Runs `syncCategoryTaxonomy` first — the same idempotent function
 * `npm run db:seed` / `npm run db:sync-categories` use — so it works on
 * both a freshly seeded and an already-populated development database.
 * The taxonomy rows themselves are the app's real data and are left in
 * place; only fixtures created here (`trends-test-` prefixed) are removed.
 */

const createdProductIds: string[] = [];
const createdCategoryIds: string[] = [];

afterAll(async () => {
  if (createdProductIds.length > 0) await db.delete(products).where(inArray(products.id, createdProductIds));
  // Children before parents.
  for (const id of [...createdCategoryIds].reverse()) await db.delete(categories).where(eq(categories.id, id));
});

async function idOf(slug: string): Promise<string> {
  const [row] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug));
  if (!row) throw new Error(`category ${slug} missing`);
  return row.id;
}

async function makeProductIn(slug: string) {
  const { product } = await createTestProductWithVariant(await idOf(slug));
  createdProductIds.push(product.id);
  return product;
}

describe("taxonomy sync", () => {
  it("creates the whole tree and is idempotent on a second run", async () => {
    await syncCategoryTaxonomy(db);
    const second = await syncCategoryTaxonomy(db);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(CATEGORY_TAXONOMY.length);
    expect(second.idBySlug.size).toBe(CATEGORY_TAXONOMY.length);
  });

  it("stores the parent links from the taxonomy", async () => {
    const rows = await db.select().from(categories);
    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    for (const node of CATEGORY_TAXONOMY) {
      const row = bySlug.get(node.slug);
      expect(row, node.slug).toBeDefined();
      expect(row!.name).toBe(node.name);
      expect(row!.parentId).toBe(node.parentSlug ? bySlug.get(node.parentSlug)!.id : null);
    }
  });

  it("never overwrites an admin's isActive / imageUrl choices", async () => {
    const slug = "men-clothing-vests";
    const id = await idOf(slug);
    try {
      await db.update(categories).set({ isActive: false, imageUrl: "/assets/categories/custom.jpg" }).where(eq(categories.id, id));
      await syncCategoryTaxonomy(db);
      const [row] = await db.select().from(categories).where(eq(categories.id, id));
      expect(row!.isActive).toBe(false);
      expect(row!.imageUrl).toBe("/assets/categories/custom.jpg");
    } finally {
      await db.update(categories).set({ isActive: true, imageUrl: null }).where(eq(categories.id, id));
    }
  });

  it("re-parents and renames a drifted taxonomy category back to the taxonomy's values", async () => {
    const slug = "men-clothing-shorts";
    const id = await idOf(slug);
    await db.update(categories).set({ name: "قدیمی", parentId: null }).where(eq(categories.id, id));
    const result = await syncCategoryTaxonomy(db);
    expect(result.updated).toBe(1);
    const [row] = await db.select().from(categories).where(eq(categories.id, id));
    expect(row!.name).toBe("شلوارک مردانه");
    expect(row!.parentId).toBe(await idOf("men-clothing"));
  });
});

describe("storefront tree", () => {
  it("exposes مردانه / زنانه / بچگانه as the roots, each with four groups", async () => {
    const roots = await getRootCategories();
    expect(roots.map((root) => root.name).slice(0, 3)).toEqual(["مردانه", "زنانه", "بچگانه"]);
    const tree = await getCategoryTree();
    for (const root of tree.slice(0, 3)) {
      expect(root.children.map((child) => child.slug)).toEqual([
        `${root.slug}-clothing`,
        `${root.slug}-shoes`,
        `${root.slug}-bags`,
        `${root.slug}-accessories`,
      ]);
    }
  });

  it("resolves trail, children and siblings for each level", async () => {
    const audience = await getCategoryBySlug("men");
    expect(audience!.trail).toEqual([]);
    expect(audience!.children.map((child) => child.name)).toEqual([
      "لباس مردانه",
      "کفش مردانه",
      "کیف مردانه",
      "اکسسوری مردانه",
    ]);
    expect(audience!.siblings).toEqual([]);

    const type = await getCategoryBySlug("men-clothing-shirts");
    expect(type!.depth).toBe(3);
    expect(type!.trail.map((step) => step.slug)).toEqual(["men", "men-clothing"]);
    expect(type!.children).toEqual([]);
    expect(type!.siblings.map((sibling) => sibling.slug)).toContain("men-clothing-pants");
    expect(type!.siblings.map((sibling) => sibling.slug)).toContain("men-clothing-shirts");

    expect(await getCategoryBySlug("no-such-category")).toBeNull();
  });

  it("hides a whole branch when its parent is inactive, even if the child is active", async () => {
    const suffix = Date.now().toString(36);
    const [parent] = await db
      .insert(categories)
      .values({ slug: `trends-test-hidden-parent-${suffix}`, name: "والد غیرفعال", isActive: false })
      .returning();
    createdCategoryIds.push(parent!.id);
    const [child] = await db
      .insert(categories)
      .values({ slug: `trends-test-hidden-child-${suffix}`, name: "فرزند فعال", parentId: parent!.id, isActive: true })
      .returning();
    createdCategoryIds.push(child!.id);

    expect(await getCategoryBySlug(parent!.slug)).toBeNull();
    expect(await getCategoryBySlug(child!.slug)).toBeNull();
    expect(await getProductsByCategorySlug({ slug: child!.slug })).toBeNull();

    // Switching the parent on brings the child back.
    await db.update(categories).set({ isActive: true }).where(eq(categories.id, parent!.id));
    expect((await getCategoryBySlug(child!.slug))!.trail.map((step) => step.slug)).toEqual([parent!.slug]);
  });
});

describe("tree-aware product listings", () => {
  it("shows a product on its type page, its group page and its audience page — and nowhere else", async () => {
    const product = await makeProductIn("men-clothing-shirts");

    for (const slug of ["men-clothing-shirts", "men-clothing", "men"]) {
      const listing = await getProductsByCategorySlug({ slug });
      expect(listing!.products.map((p) => p.slug), slug).toContain(product.slug);
    }
    for (const slug of ["men-clothing-pants", "men-shoes", "women", "women-clothing", "kids"]) {
      const listing = await getProductsByCategorySlug({ slug });
      expect(listing!.products.map((p) => p.slug), slug).not.toContain(product.slug);
    }
  });

  it("counts products across the subtree in `total`", async () => {
    const before = (await getProductsByCategorySlug({ slug: "kids" }))!.total;
    await makeProductIn("kids-shoes-sandals");
    await makeProductIn("kids-bags-backpacks");
    expect((await getProductsByCategorySlug({ slug: "kids" }))!.total).toBe(before + 2);
    expect((await getProductsByCategorySlug({ slug: "kids-shoes" }))!.products.length).toBeGreaterThanOrEqual(1);
  });

  it("finds products by category name in search, not only by title", async () => {
    const product = await makeProductIn("women-accessories-rousari");
    const result = await searchProducts({ q: "روسری" });
    expect(result.products.map((p) => p.slug)).toContain(product.slug);
  });

  it("tops up 'related products' from the rest of the group when the type is sparse", async () => {
    const anchor = await makeProductIn("men-clothing-cargo-pants");
    const sameGroupOtherType = await makeProductIn("men-clothing-socks");
    const otherGroup = await makeProductIn("men-shoes-boots");

    const related = await getRelatedProducts("men-clothing-cargo-pants", anchor.id, 12);
    const slugs = related.map((p) => p.slug);
    expect(slugs).toContain(sameGroupOtherType.slug);
    expect(slugs).not.toContain(otherGroup.slug);
    expect(slugs).not.toContain(anchor.slug);
  });
});

describe("product → category rule", () => {
  it("accepts a type (leaf) category", async () => {
    expect(await getProductCategoryError(await idOf("men-clothing-hoodies"))).toBeNull();
  });

  it("rejects audience and group categories (they have sub-categories)", async () => {
    expect(await getProductCategoryError(await idOf("men"))).toMatch(/دسته نهایی/);
    expect(await getProductCategoryError(await idOf("men-clothing"))).toMatch(/دسته نهایی/);
  });

  it("rejects an id that doesn't exist", async () => {
    expect(await getProductCategoryError("00000000-0000-4000-8000-000000000000")).toMatch(/یافت نشد/);
  });
});

describe("database guards", () => {
  it("refuses to make a category its own parent (CHECK constraint, not just app code)", async () => {
    const id = await idOf("men-clothing-shirts");
    await expect(db.update(categories).set({ parentId: id }).where(eq(categories.id, id))).rejects.toThrow();
    const [row] = await db.select().from(categories).where(eq(categories.id, id));
    expect(row!.parentId).toBe(await idOf("men-clothing"));
  });
});

describe("assignment audit", () => {
  it("lists legacy categories outside the taxonomy and products sitting on non-leaf categories", async () => {
    const suffix = Date.now().toString(36);
    const [legacy] = await db
      .insert(categories)
      .values({ slug: `trends-test-legacy-${suffix}`, name: "دسته قدیمی" })
      .returning();
    createdCategoryIds.push(legacy!.id);
    const legacyProduct = await createTestProductWithVariant(legacy!.id);
    createdProductIds.push(legacyProduct.product.id);
    const stranded = await createTestProductWithVariant(await idOf("men"));
    createdProductIds.push(stranded.product.id);

    const audit = await auditCategoryAssignments(db);
    expect(audit.outsideTaxonomy.find((c) => c.slug === legacy!.slug)?.productCount).toBe(1);
    expect(audit.productsOnNonLeafCategory.map((p) => p.slug)).toContain(stranded.product.slug);
    // A product on a legacy *leaf* isn't "stranded on a parent" — it's reported via its category instead.
    expect(audit.productsOnNonLeafCategory.map((p) => p.slug)).not.toContain(legacyProduct.product.slug);
  });
});
