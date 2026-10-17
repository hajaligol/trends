import { describe, expect, it } from "vitest";
import {
  EMPTY_LISTING_FILTERS,
  buildListingHref,
  countActiveFilters,
  isDefaultListing,
  parseListingFilters,
  parsePriceInput,
} from "@/domains/catalog/listing-filters";
import { PRODUCT_SORT_OPTIONS } from "@/domains/catalog/presentation";

describe("parsePriceInput", () => {
  it("reads Persian / Arabic / Latin digits and ignores separators", () => {
    expect(parsePriceInput("۱۲۰,۰۰۰")).toBe(120000);
    expect(parsePriceInput("٣٠٠٠")).toBe(3000);
    expect(parsePriceInput("1 500 000")).toBe(1500000);
    expect(parsePriceInput("۱٬۵۰۰")).toBe(1500);
  });
  it("rejects empty, non-numeric and absurdly large values", () => {
    expect(parsePriceInput("")).toBeUndefined();
    expect(parsePriceInput(undefined)).toBeUndefined();
    expect(parsePriceInput("abc")).toBeUndefined();
    expect(parsePriceInput("9".repeat(20))).toBeUndefined();
  });
});

describe("parseListingFilters", () => {
  it("parses every filter from repeated params", () => {
    const filters = parseListingFilters({
      sort: "discount",
      brand: ["nike", "adidas"],
      cat: "men-shirts",
      size: ["M", "L"],
      color: "مشکی",
      min: "۱۰۰۰۰۰",
      max: "900000",
      available: "1",
    });
    expect(filters).toMatchObject({
      sort: "discount",
      categories: ["men-shirts"],
      colors: ["مشکی"],
      priceMin: 100000,
      priceMax: 900000,
      availableOnly: true,
    });
    expect([...filters.brands].sort()).toEqual(["adidas", "nike"]);
    expect([...filters.sizes].sort()).toEqual(["L", "M"]);
  });
  it("ignores invalid sorts, swaps a reversed price range, de-duplicates and trims", () => {
    expect(parseListingFilters({ sort: "random" }).sort).toBeUndefined();
    const reversed = parseListingFilters({ min: "900", max: "100" });
    expect([reversed.priceMin, reversed.priceMax]).toEqual([100, 900]);
    expect(parseListingFilters({ brand: [" a ", "a", ""] }).brands).toEqual(["a"]);
    expect(parseListingFilters({ available: "0" }).availableOnly).toBe(false);
  });
  it("caps the number and length of values", () => {
    const many = Array.from({ length: 80 }, (_, i) => `b${i}`);
    expect(parseListingFilters({ brand: many }).brands).toHaveLength(30);
    expect(parseListingFilters({ brand: "x".repeat(101) }).brands).toEqual([]);
  });
  it("accepts the legacy single size/color links", () => {
    const filters = parseListingFilters({ size: "M", color: "سفید" });
    expect(filters.sizes).toEqual(["M"]);
    expect(filters.colors).toEqual(["سفید"]);
  });
});

describe("buildListingHref", () => {
  it("is clean for the default state", () => {
    expect(buildListingHref("/category/men", EMPTY_LISTING_FILTERS)).toBe("/category/men");
    expect(buildListingHref("/category/men", { ...EMPTY_LISTING_FILTERS, sort: "newest" })).toBe("/category/men");
  });
  it("omits the sort only when it equals the page's default", () => {
    const bestSelling = { ...EMPTY_LISTING_FILTERS, sort: "best-selling" as const };
    expect(buildListingHref("/collection/top-selling", bestSelling, { defaultSort: "best-selling" })).toBe(
      "/collection/top-selling",
    );
    expect(buildListingHref("/category/men", bestSelling)).toBe("/category/men?sort=best-selling");
  });
  it("round-trips through the parser (order-independent)", () => {
    const original = {
      sort: "price-asc" as const,
      brands: ["b", "a"],
      categories: ["c"],
      sizes: ["XL", "M"],
      colors: ["مشکی", "سفید"],
      priceMin: 1000,
      priceMax: 5000,
      availableOnly: true,
    };
    const href = buildListingHref("/search", original, { q: "کفش", page: 3 });
    const url = new URL(href, "https://x.test");
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("q")).toBe("کفش");
    expect(url.searchParams.get("page")).toBe("3");
    const reparsed = parseListingFilters(
      Object.fromEntries([...new Set(url.searchParams.keys())].map((key) => [key, url.searchParams.getAll(key)])),
    );
    expect(reparsed).toEqual({
      ...original,
      brands: [...original.brands].sort(),
      sizes: [...original.sizes].sort(),
      colors: [...original.colors].sort((a, b) => a.localeCompare(b, "fa")),
    });
    // Same filters in a different order → the same URL.
    expect(buildListingHref("/search", { ...original, brands: ["a", "b"] }, { q: "کفش", page: 3 })).toBe(href);
  });
  it("never writes page 1", () => {
    expect(buildListingHref("/x", EMPTY_LISTING_FILTERS, { page: 1 })).toBe("/x");
  });
});

describe("filter bookkeeping", () => {
  it("counts filter groups, not values, and ignores sort", () => {
    expect(countActiveFilters({ ...EMPTY_LISTING_FILTERS, sort: "discount" })).toBe(0);
    expect(
      countActiveFilters({ ...EMPTY_LISTING_FILTERS, brands: ["a", "b"], priceMin: 1, availableOnly: true }),
    ).toBe(3);
  });
  it("isDefaultListing is false for any filter or non-default sort", () => {
    expect(isDefaultListing(EMPTY_LISTING_FILTERS)).toBe(true);
    expect(isDefaultListing({ ...EMPTY_LISTING_FILTERS, sort: "newest" })).toBe(true);
    expect(isDefaultListing({ ...EMPTY_LISTING_FILTERS, sort: "price-asc" })).toBe(false);
    expect(isDefaultListing({ ...EMPTY_LISTING_FILTERS, availableOnly: true })).toBe(false);
  });
  it("offers the five requested sorts", () => {
    expect(PRODUCT_SORT_OPTIONS.map((option) => option.value)).toEqual([
      "price-asc",
      "price-desc",
      "newest",
      "discount",
      "best-selling",
    ]);
  });
});
