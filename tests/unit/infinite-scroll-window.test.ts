import { describe, expect, it } from "vitest";
import { INFINITE_SCROLL_MAX_PAGE, listingProgress, listingWindowFor } from "@/domains/catalog/presentation";
import { loadMoreInputSchema } from "@/domains/catalog/load-more-schema";

describe("listingWindowFor", () => {
  it("pages 1..5 are the infinite zone and re-render pages 1..N", () => {
    expect(INFINITE_SCROLL_MAX_PAGE).toBe(5);
    expect(listingWindowFor(1)).toEqual({ fetchPage: 1, pageSpan: 1, infinite: true });
    expect(listingWindowFor(3)).toEqual({ fetchPage: 1, pageSpan: 3, infinite: true });
    expect(listingWindowFor(5)).toEqual({ fetchPage: 1, pageSpan: 5, infinite: true });
  });
  it("page 6+ is a plain numbered page", () => {
    expect(listingWindowFor(6)).toEqual({ fetchPage: 6, pageSpan: 1, infinite: false });
    expect(listingWindowFor(40)).toEqual({ fetchPage: 40, pageSpan: 1, infinite: false });
  });
  it("garbage falls back to page 1", () => {
    expect(listingWindowFor(0).pageSpan).toBe(1);
    expect(listingWindowFor(Number.NaN).infinite).toBe(true);
  });
});

describe("listingProgress", () => {
  it("keeps scrolling until page 5 (or the last page if fewer)", () => {
    const first = listingProgress(listingWindowFor(1), 1, 9, 1);
    expect(first).toMatchObject({ loadedThrough: 1, lastInfinitePage: 5, hasMore: true, needsPagination: true });
    const short = listingProgress(listingWindowFor(1), 1, 3, 1);
    expect(short).toMatchObject({ lastInfinitePage: 3, hasMore: true, needsPagination: false });
    expect(listingProgress(listingWindowFor(3), 3, 3, 1).hasMore).toBe(false);
  });
  it("?page=5 is fully loaded, with pagination to follow when there are more pages", () => {
    expect(listingProgress(listingWindowFor(5), 5, 8, 1)).toMatchObject({ loadedThrough: 5, hasMore: false, needsPagination: true });
  });
  it("numbered zone reports the real page and never scrolls", () => {
    const p = listingProgress(listingWindowFor(7), 7, 9, 7);
    expect(p).toMatchObject({ loadedThrough: 7, hasMore: false, clampedIntoInfiniteZone: false });
  });
  it("a page past the end of a short list is flagged to redirect into the infinite zone", () => {
    expect(listingProgress(listingWindowFor(99), 99, 3, 3).clampedIntoInfiniteZone).toBe(true);
  });
});

describe("loadMoreInputSchema", () => {
  const source = { kind: "category", slug: "men" } as const;
  it("accepts pages 2..5 only", () => {
    expect(loadMoreInputSchema.safeParse({ source, page: 2 }).success).toBe(true);
    expect(loadMoreInputSchema.safeParse({ source, page: 5 }).success).toBe(true);
    expect(loadMoreInputSchema.safeParse({ source, page: 1 }).success).toBe(false);
    expect(loadMoreInputSchema.safeParse({ source, page: 6 }).success).toBe(false);
    expect(loadMoreInputSchema.safeParse({ source, page: 2.5 }).success).toBe(false);
  });
  it("rejects unknown kinds, bad sorts and unknown collections", () => {
    expect(loadMoreInputSchema.safeParse({ source: { kind: "admin" }, page: 2 }).success).toBe(false);
    expect(loadMoreInputSchema.safeParse({ source: { ...source, sort: "random" }, page: 2 }).success).toBe(false);
    expect(loadMoreInputSchema.safeParse({ source: { kind: "collection", slug: "nope" }, page: 2 }).success).toBe(false);
  });
});
