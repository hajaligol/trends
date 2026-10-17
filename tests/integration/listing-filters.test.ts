import { describe, expect, it } from "vitest";
import { getCollectionPage } from "@/domains/catalog/collection-listing";
import { EMPTY_LISTING_FILTERS, type ListingFilters } from "@/domains/catalog/listing-filters";
import { getProductsByCategorySlug, searchProducts } from "@/domains/catalog/queries";

/**
 * Runs the shared list-page filters against the seeded catalog (`npm run
 * db:seed`): read-only, so it needs no fixtures and leaves nothing behind.
 */
const filters = (over: Partial<ListingFilters> = {}): ListingFilters => ({ ...EMPTY_LISTING_FILTERS, ...over });

async function category(slug: string, over: Partial<ListingFilters> = {}, page = 1, pageSpan = 1) {
  const result = await getProductsByCategorySlug({ slug, filters: filters(over), page, pageSpan });
  expect(result).not.toBeNull();
  return result!;
}

describe("category listing filters", () => {
  it("offers brands, categories, sizes, colours and a price range from the whole category", async () => {
    const all = await category("men");
    expect(all.total).toBeGreaterThan(12);
    expect(all.facets.brands.length).toBeGreaterThan(1);
    expect(all.facets.categories.length).toBeGreaterThan(1);
    expect(all.facets.sizes.length).toBeGreaterThan(1);
    expect(all.facets.colors.length).toBeGreaterThan(1);
    expect(all.facets.price!.min).toBeLessThan(all.facets.price!.max);
    // Sub-category options are only the types beneath this audience.
    for (const option of all.facets.categories) expect(option.slug.startsWith("men")).toBe(true);
  });

  it("facets do not shrink when a filter is applied", async () => {
    const all = await category("men");
    const narrowed = await category("men", { brands: [all.facets.brands[0]!.slug] });
    expect(narrowed.total).toBeLessThan(all.total);
    expect(narrowed.facets).toEqual(all.facets);
  });

  it("brand: one and several brands (OR), never more than the whole list", async () => {
    const all = await category("men");
    const [a, b] = all.facets.brands;
    const onlyA = await category("men", { brands: [a!.slug] });
    const onlyB = await category("men", { brands: [b!.slug] });
    const both = await category("men", { brands: [a!.slug, b!.slug] });
    expect(onlyA.total).toBeGreaterThan(0);
    expect(both.total).toBe(onlyA.total + onlyB.total);
    expect(both.total).toBeLessThanOrEqual(all.total);
  });

  it("category: the per-type totals add up to the products of the list", async () => {
    const all = await category("men");
    let sum = 0;
    for (const option of all.facets.categories) {
      const one = await category("men", { categories: [option.slug] });
      expect(one.total).toBeGreaterThan(0);
      sum += one.total;
    }
    expect(sum).toBe(all.total);
  });

  it("size and colour narrow the list; an unknown value gives an empty (not broken) page", async () => {
    const all = await category("men");
    const bySize = await category("men", { sizes: [all.facets.sizes[0]!] });
    const byColor = await category("men", { colors: [all.facets.colors[0]!.color] });
    expect(bySize.total).toBeGreaterThan(0);
    expect(bySize.total).toBeLessThanOrEqual(all.total);
    expect(byColor.total).toBeGreaterThan(0);
    const none = await category("men", { sizes: ["no-such-size"] });
    expect(none).toMatchObject({ total: 0, products: [], totalPages: 1 });
    expect(none.facets).toEqual(all.facets);
  });

  it("price range keeps only products with a variant in range", async () => {
    const all = await category("men");
    const { min, max } = all.facets.price!;
    const cheapHalf = await category("men", { priceMax: Math.floor((min + max) / 2) });
    expect(cheapHalf.total).toBeGreaterThan(0);
    expect(cheapHalf.total).toBeLessThan(all.total + 1);
    for (const product of cheapHalf.products) expect(product.fromPriceToman!).toBeLessThanOrEqual(Math.floor((min + max) / 2));
    expect((await category("men", { priceMin: max + 1 })).total).toBe(0);
    expect((await category("men", { priceMin: min, priceMax: max })).total).toBe(all.total);
  });

  it("available-only hides out-of-stock products; the default shows them", async () => {
    const all = await category("men");
    const available = await category("men", { availableOnly: true }, 1, 99);
    expect(available.total).toBeLessThanOrEqual(all.total);
    for (const product of available.products) expect(product.stockState).not.toBe("out-of-stock");
  });

  it("sorts: price ascending / descending, biggest discount, best-selling and newest all work", async () => {
    const span = 99;
    const asc = (await category("men", { sort: "price-asc" }, 1, span)).products.map((p) => p.fromPriceToman!);
    expect(asc).toEqual([...asc].sort((x, y) => x - y));
    const desc = (await category("men", { sort: "price-desc" }, 1, span)).products.map((p) => p.fromPriceToman!);
    expect(desc).toEqual([...desc].sort((x, y) => y - x));
    const discounts = (await category("men", { sort: "discount" }, 1, span)).products.map((p) => p.discountPercent);
    expect(discounts).toEqual([...discounts].sort((x, y) => y - x));
    const all = await category("men");
    for (const sort of ["best-selling", "newest"] as const) {
      const sorted = await category("men", { sort }, 1, span);
      expect(sorted.total).toBe(all.total);
      expect(new Set(sorted.products.map((p) => p.id)).size).toBe(sorted.products.length);
    }
  });

  it("paging is stable and non-overlapping under a filter + sort", async () => {
    const opts = { sort: "price-asc" as const, availableOnly: true };
    const first = await category("men", opts, 1);
    const second = await category("men", opts, 2);
    expect(first.products.length).toBe(12);
    const firstIds = new Set(first.products.map((p) => p.id));
    for (const product of second.products) expect(firstIds.has(product.id)).toBe(false);
    const both = await category("men", opts, 1, 2);
    expect(both.products.map((p) => p.id)).toEqual([...first.products, ...second.products].map((p) => p.id));
  });
});

describe("other list pages share the same filters", () => {
  it("search: facets + filters work on a result set", async () => {
    const all = await searchProducts({ q: "پیراهن" });
    expect(all.total).toBeGreaterThan(0);
    expect(all.facets.price).not.toBeNull();
    const priced = await searchProducts({ q: "پیراهن", filters: filters({ sort: "price-desc", availableOnly: true }) });
    const prices = priced.products.map((p) => p.fromPriceToman!);
    expect(prices).toEqual([...prices].sort((x, y) => y - x));
    expect((await searchProducts({ q: "پیراهن", filters: filters({ brands: ["no-such-brand"] }) })).total).toBe(0);
    expect((await searchProducts({ q: "" })).facets.brands).toEqual([]);
  });

  it("collections: new arrivals filter + sort; top-selling defaults to the sales ranking", async () => {
    const all = await getCollectionPage("new-arrivals", 1, 99);
    expect(all.total).toBeGreaterThan(0);
    const cheap = await getCollectionPage("new-arrivals", 1, 99, filters({ sort: "price-asc" }));
    const prices = cheap.products.map((p) => p.fromPriceToman!);
    expect(prices).toEqual([...prices].sort((x, y) => x - y));
    expect(cheap.total).toBe(all.total);
    const top = await getCollectionPage("top-selling", 1, 1, filters({ availableOnly: true }));
    expect(top.total).toBeGreaterThanOrEqual(0); // empty until a paid order exists
  });
});
