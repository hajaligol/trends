import { describe, expect, it } from "vitest";
import {
  CATEGORY_TAXONOMY,
  DEMO_PRODUCT_CATEGORY_SLUG,
  ROOT_CATEGORY_SLUGS,
} from "@/domains/categories/taxonomy";
import { MAX_CATEGORY_DEPTH } from "@/domains/categories/tree";

const bySlug = new Map(CATEGORY_TAXONOMY.map((node) => [node.slug, node]));

describe("category taxonomy", () => {
  it("has exactly the three audiences the store asked for, in order", () => {
    const roots = CATEGORY_TAXONOMY.filter((node) => node.depth === 1);
    expect(roots.map((node) => node.name)).toEqual(["مردانه", "زنانه", "بچگانه"]);
    expect(roots.map((node) => node.slug)).toEqual([...ROOT_CATEGORY_SLUGS]);
  });

  it("gives every audience the four groups لباس / کفش / کیف / اکسسوری", () => {
    for (const audience of CATEGORY_TAXONOMY.filter((node) => node.depth === 1)) {
      const groups = CATEGORY_TAXONOMY.filter((node) => node.parentSlug === audience.slug);
      expect(groups.map((group) => group.name)).toEqual([
        `لباس ${audience.name}`,
        `کفش ${audience.name}`,
        `کیف ${audience.name}`,
        `اکسسوری ${audience.name}`,
      ]);
    }
  });

  it("gives every group at least one type", () => {
    for (const group of CATEGORY_TAXONOMY.filter((node) => node.depth === 2)) {
      expect(CATEGORY_TAXONOMY.some((node) => node.parentSlug === group.slug)).toBe(true);
    }
  });

  it("covers the men's clothing types the store listed (shirt, t-shirt, jacket, pants, hoodie, puffer)", () => {
    const names = CATEGORY_TAXONOMY.filter((node) => node.parentSlug === "men-clothing").map((node) => node.name);
    for (const expected of ["پیراهن مردانه", "تیشرت مردانه", "کاپشن مردانه", "شلوار پارچه‌ای مردانه", "هودی مردانه", "پافر مردانه"]) {
      expect(names).toContain(expected);
    }
  });

  it("uses unique slugs and unique names", () => {
    const slugs = CATEGORY_TAXONOMY.map((node) => node.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const names = CATEGORY_TAXONOMY.map((node) => node.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("only uses slugs the admin slug validator would accept", () => {
    for (const node of CATEGORY_TAXONOMY) {
      expect(node.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("lists parents before children and never nests deeper than the allowed maximum", () => {
    const seen = new Set<string>();
    for (const node of CATEGORY_TAXONOMY) {
      if (node.parentSlug) {
        expect(seen.has(node.parentSlug)).toBe(true);
        expect(node.depth).toBe(bySlug.get(node.parentSlug)!.depth + 1);
      } else {
        expect(node.depth).toBe(1);
      }
      expect(node.depth).toBeLessThanOrEqual(MAX_CATEGORY_DEPTH);
      seen.add(node.slug);
    }
  });

  it("numbers siblings 0..n-1 so menus keep the declared order", () => {
    const parents = new Set(CATEGORY_TAXONOMY.map((node) => node.parentSlug));
    for (const parent of parents) {
      const orders = CATEGORY_TAXONOMY.filter((node) => node.parentSlug === parent).map((node) => node.displayOrder);
      expect(orders).toEqual(orders.map((_, index) => index));
    }
  });

  it("names every type after its audience so titles and search hits are unambiguous", () => {
    for (const type of CATEGORY_TAXONOMY.filter((node) => node.depth === 3)) {
      const audience = bySlug.get(type.slug.split("-")[0]!)!;
      const isPlainByDesign = ["لباس نوزاد", "کفش نوزاد", "اکسسوری نوزاد"].includes(type.name);
      if (!isPlainByDesign) expect(type.name.endsWith(audience.name)).toBe(true);
    }
  });

  it("files every demo product under a type (leaf) category that exists", () => {
    for (const slug of Object.values(DEMO_PRODUCT_CATEGORY_SLUG)) {
      const node = bySlug.get(slug);
      expect(node, slug).toBeDefined();
      expect(node!.depth).toBe(3);
    }
  });
});
