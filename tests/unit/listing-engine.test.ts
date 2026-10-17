import { describe, expect, it } from "vitest";
import {
  LISTING_PAGE_SIZE,
  compareSizes,
  computeFacets,
  filterCandidates,
  runListing,
  sortCandidates,
  type ListingCandidate,
  type ListingVariant,
} from "@/domains/catalog/listing-engine";
import { EMPTY_LISTING_FILTERS, type ListingFilters } from "@/domains/catalog/listing-filters";
import type { CatalogProductSummary } from "@/domains/catalog/queries";

const variant = (over: Partial<ListingVariant> = {}): ListingVariant => ({
  size: "M",
  color: "مشکی",
  colorHex: "#000000",
  priceToman: 100_000,
  stock: 5,
  ...over,
});

let counter = 0;
function candidate(over: {
  id?: string;
  daysOld?: number;
  brand?: string | null;
  category?: string;
  order?: number;
  variants?: ListingVariant[];
  discountPercent?: number;
} = {}): ListingCandidate {
  counter += 1;
  const id = over.id ?? `p${counter}`;
  const variants = over.variants ?? [variant()];
  const fromPriceToman = variants.length ? Math.min(...variants.map((v) => v.priceToman)) : null;
  return {
    summary: {
      id,
      slug: id,
      title: id,
      categorySlug: over.category ?? "shirts",
      fromPriceToman,
      discountPercent: over.discountPercent ?? 0,
    } as unknown as CatalogProductSummary,
    createdAt: new Date(Date.UTC(2026, 0, 1) - (over.daysOld ?? 0) * 86_400_000),
    brand: over.brand === null ? null : { slug: over.brand ?? "nike", name: (over.brand ?? "nike").toUpperCase(), nameEn: null },
    category: { slug: over.category ?? "shirts", name: over.category ?? "shirts", order: over.order ?? 0 },
    variants,
  };
}

const filters = (over: Partial<ListingFilters> = {}): ListingFilters => ({ ...EMPTY_LISTING_FILTERS, ...over });
const ids = (list: ListingCandidate[]) => list.map((c) => c.summary.id);

describe("computeFacets", () => {
  const list = [
    candidate({ brand: "nike", category: "shirts", order: 2, variants: [variant({ size: "L", priceToman: 300 }), variant({ size: "S", color: "سفید", colorHex: "#fff", priceToman: 900 })] }),
    candidate({ brand: "adidas", category: "shoes", order: 1, variants: [variant({ size: "42", priceToman: 500 })] }),
    candidate({ brand: null, category: "shirts", order: 2, variants: [variant({ size: "XL", priceToman: 700 })] }),
  ];
  it("lists each option once, from the whole list", () => {
    const facets = computeFacets(list);
    expect(facets.brands.map((b) => b.slug)).toEqual(["adidas", "nike"]);
    expect(facets.categories.map((c) => c.slug)).toEqual(["shoes", "shirts"]); // taxonomy order
    expect(facets.colors.map((c) => c.color).sort()).toEqual(["سفید", "مشکی"].sort());
    expect(facets.price).toEqual({ min: 300, max: 900 });
  });
  it("orders sizes: letters XS→3XL, then numbers, then the rest", () => {
    expect(computeFacets(list).sizes).toEqual(["S", "L", "XL", "42"]);
    expect(["فری‌سایز", "44", "M", "XS", "38"].sort(compareSizes)).toEqual(["XS", "M", "38", "44", "فری‌سایز"]);
  });
  it("has no price range for variant-less products", () => {
    expect(computeFacets([candidate({ variants: [] })]).price).toBeNull();
  });
});

describe("filterCandidates", () => {
  const a = candidate({ id: "a", brand: "nike", category: "shirts", variants: [variant({ size: "M", color: "مشکی", priceToman: 100, stock: 0 }), variant({ size: "L", color: "سفید", priceToman: 400, stock: 3 })] });
  const b = candidate({ id: "b", brand: "adidas", category: "shoes", variants: [variant({ size: "42", color: "مشکی", priceToman: 800, stock: 2 })] });
  const c = candidate({ id: "c", brand: null, category: "shirts", variants: [variant({ size: "M", color: "سفید", priceToman: 250, stock: 0 })] });
  const all = [a, b, c];

  it("no filters → everything, including out-of-stock", () => {
    expect(ids(filterCandidates(all, filters()))).toEqual(["a", "b", "c"]);
  });
  it("brand is multi-select and excludes brandless products", () => {
    expect(ids(filterCandidates(all, filters({ brands: ["nike"] })))).toEqual(["a"]);
    expect(ids(filterCandidates(all, filters({ brands: ["nike", "adidas"] })))).toEqual(["a", "b"]);
  });
  it("category is multi-select", () => {
    expect(ids(filterCandidates(all, filters({ categories: ["shirts"] })))).toEqual(["a", "c"]);
    expect(ids(filterCandidates(all, filters({ categories: ["shirts", "shoes"] })))).toEqual(["a", "b", "c"]);
  });
  it("sizes and colours are multi-select", () => {
    expect(ids(filterCandidates(all, filters({ sizes: ["M", "42"] })))).toEqual(["a", "b", "c"]);
    expect(ids(filterCandidates(all, filters({ colors: ["سفید"] })))).toEqual(["a", "c"]);
  });
  it("price range is inclusive and matches on a variant", () => {
    expect(ids(filterCandidates(all, filters({ priceMin: 400, priceMax: 800 })))).toEqual(["a", "b"]);
    expect(ids(filterCandidates(all, filters({ priceMax: 99 })))).toEqual([]);
    expect(ids(filterCandidates(all, filters({ priceMin: 801 })))).toEqual([]);
  });
  it("available-only keeps products with at least one in-stock variant", () => {
    expect(ids(filterCandidates(all, filters({ availableOnly: true })))).toEqual(["a", "b"]);
  });
  it("variant-level filters must hold on ONE variant (size M + white is not satisfied by a)", () => {
    // a has M (black) and L (white) — but no white M.
    expect(ids(filterCandidates(all, filters({ sizes: ["M"], colors: ["سفید"] })))).toEqual(["c"]);
    // a's cheap variant is out of stock; its in-stock one costs 400.
    expect(ids(filterCandidates(all, filters({ priceMax: 300, availableOnly: true })))).toEqual([]);
    expect(ids(filterCandidates(all, filters({ priceMax: 500, availableOnly: true })))).toEqual(["a"]);
  });
  it("filters combine with AND across groups", () => {
    expect(ids(filterCandidates(all, filters({ brands: ["nike"], categories: ["shoes"] })))).toEqual([]);
  });
  it("a product without variants never passes a variant-level filter", () => {
    const bare = candidate({ id: "bare", variants: [] });
    expect(ids(filterCandidates([bare], filters()))).toEqual(["bare"]);
    expect(ids(filterCandidates([bare], filters({ availableOnly: true })))).toEqual([]);
  });
});

describe("sortCandidates", () => {
  const cheap = candidate({ id: "cheap", daysOld: 5, discountPercent: 10, variants: [variant({ priceToman: 100 })] });
  const mid = candidate({ id: "mid", daysOld: 1, discountPercent: 40, variants: [variant({ priceToman: 500 })] });
  const dear = candidate({ id: "dear", daysOld: 3, discountPercent: 0, variants: [variant({ priceToman: 900 })] });
  const noPrice = candidate({ id: "none", daysOld: 0, variants: [] });
  const all = [dear, noPrice, cheap, mid];

  it("price ascending / descending, products without a price last", () => {
    expect(ids(sortCandidates(all, "price-asc"))).toEqual(["cheap", "mid", "dear", "none"]);
    expect(ids(sortCandidates(all, "price-desc"))).toEqual(["dear", "mid", "cheap", "none"]);
  });
  it("newest first", () => {
    expect(ids(sortCandidates(all, "newest"))).toEqual(["none", "mid", "dear", "cheap"]);
  });
  it("biggest discount first, ties → newest", () => {
    expect(ids(sortCandidates(all, "discount"))).toEqual(["mid", "cheap", "none", "dear"]);
  });
  it("best-selling by units sold, unsold products after, ties → newest", () => {
    const sold = new Map([["cheap", 9], ["dear", 9], ["mid", 2]]);
    expect(ids(sortCandidates(all, "best-selling", sold))).toEqual(["dear", "cheap", "mid", "none"]);
  });
  it("does not mutate its input", () => {
    const copy = [...all];
    sortCandidates(all, "price-asc");
    expect(all).toEqual(copy);
  });
});

describe("runListing", () => {
  const many = Array.from({ length: 30 }, (_, i) =>
    candidate({ id: `m${String(i).padStart(2, "0")}`, daysOld: i, variants: [variant({ priceToman: (i + 1) * 1000 })] }),
  );

  it("pages the sorted result and reports totals", () => {
    const first = runListing({ candidates: many, filters: filters() });
    expect(first.total).toBe(30);
    expect(first.totalPages).toBe(Math.ceil(30 / LISTING_PAGE_SIZE));
    expect(first.products).toHaveLength(LISTING_PAGE_SIZE);
    expect(first.products[0]!.id).toBe("m00"); // newest
    const third = runListing({ candidates: many, filters: filters(), page: 3 });
    expect(third.products).toHaveLength(30 - 2 * LISTING_PAGE_SIZE);
  });
  it("pageSpan returns pages 1..N for infinite scroll; out-of-range pages clamp", () => {
    expect(runListing({ candidates: many, filters: filters(), page: 1, pageSpan: 2 }).products).toHaveLength(24);
    expect(runListing({ candidates: many, filters: filters(), page: 99 }).page).toBe(3);
  });
  it("uses the page's default sort unless the URL overrides it", () => {
    const byDefault = runListing({ candidates: many, filters: filters(), defaultSort: "price-desc" });
    expect(byDefault.products[0]!.id).toBe("m29");
    const overridden = runListing({ candidates: many, filters: filters({ sort: "price-asc" }), defaultSort: "price-desc" });
    expect(overridden.products[0]!.id).toBe("m00");
  });
  it("facets come from the unfiltered list, so choices survive a narrowing filter", () => {
    const result = runListing({ candidates: many, filters: filters({ priceMax: 3000 }) });
    expect(result.total).toBe(3);
    expect(result.facets.price).toEqual({ min: 1000, max: 30000 });
  });
  it("distinguishes 'nothing in the list' (0 pages) from 'filtered to nothing' (1 page)", () => {
    expect(runListing({ candidates: [], filters: filters() })).toMatchObject({ total: 0, totalPages: 0 });
    expect(runListing({ candidates: many, filters: filters({ brands: ["nobody"] }) })).toMatchObject({
      total: 0,
      totalPages: 1,
      products: [],
    });
  });
});
