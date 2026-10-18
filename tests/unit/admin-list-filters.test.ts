import { describe, expect, it } from "vitest";
import {
  containsPattern,
  dateRangeBounds,
  escapeLike,
  mobileSearchDigits,
  normalizeSearchText,
  sanitizeDateRange,
} from "@/lib/utils/admin-filters";
import { tehranDayEndExclusive, tehranDayStart } from "@/lib/utils/tehran-time";
import { couponValidity, filterCoupons, parseCouponFilter, countCouponsByValidity } from "@/domains/promotions/admin-filter";
import { filterBrands, parseBrandFilter, brandCountries } from "@/domains/brands/admin-filter";
import { filterCategoryRows, parseCategoryFilter } from "@/domains/categories/admin-filter";
import { filterCampaigns, countCampaignsByStatus, parseCampaignFilter } from "@/domains/campaigns/admin-filter";
import type { AdminCouponRow } from "@/domains/promotions/admin-queries";
import type { AdminBrandRow } from "@/domains/brands/queries";
import type { AdminCategoryRow } from "@/domains/categories/queries";
import type { AdminCampaignListItem } from "@/domains/campaigns/admin-queries";

describe("normalizeSearchText", () => {
  it("converts Persian/Arabic digits and Arabic letters, trims and collapses spaces", () => {
    expect(normalizeSearchText("  ۰۹۱۲   ۱۲۳  ")).toBe("0912 123");
    expect(normalizeSearchText("٠١٢")).toBe("012");
    expect(normalizeSearchText("علي كاظمي")).toBe("علی کاظمی");
  });
  it("returns undefined for empty input and caps length", () => {
    expect(normalizeSearchText("   ")).toBeUndefined();
    expect(normalizeSearchText(undefined)).toBeUndefined();
    expect(normalizeSearchText("a".repeat(500))!.length).toBe(100);
  });
  it("takes the first value of a repeated param", () => {
    expect(normalizeSearchText(["first", "second"])).toBe("first");
  });
  it("keeps ZWNJ so half-space Persian words still match stored text", () => {
    expect(normalizeSearchText("می‌خواهم")).toBe("می‌خواهم");
  });
});

describe("LIKE escaping", () => {
  it("escapes %, _ and backslash so they match literally", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(containsPattern("a%b")).toBe("%a\\%b%");
  });
});

describe("mobileSearchDigits", () => {
  it("reduces every typed form to the national digits", () => {
    expect(mobileSearchDigits("09121234567")).toBe("9121234567");
    expect(mobileSearchDigits("9121234567")).toBe("9121234567");
    expect(mobileSearchDigits("+989121234567")).toBe("9121234567");
    expect(mobileSearchDigits("989121234567")).toBe("9121234567");
  });
  it("ignores text and too-short digit runs", () => {
    expect(mobileSearchDigits("علی")).toBeUndefined();
    expect(mobileSearchDigits("12")).toBeUndefined();
  });
});

describe("Tehran day boundaries", () => {
  it("starts the day at Tehran midnight (UTC+03:30)", () => {
    expect(tehranDayStart("2026-10-19")!.toISOString()).toBe("2026-10-18T20:30:00.000Z");
  });
  it("end is the next Tehran midnight (exclusive)", () => {
    expect(tehranDayEndExclusive("2026-10-19")!.toISOString()).toBe("2026-10-19T20:30:00.000Z");
  });
  it("rejects malformed and impossible dates", () => {
    expect(tehranDayStart("2026-02-31")).toBeNull();
    expect(tehranDayStart("19-10-2026")).toBeNull();
    expect(tehranDayStart("")).toBeNull();
    expect(tehranDayStart(undefined)).toBeNull();
  });
  it("sanitizeDateRange drops invalid values; dateRangeBounds swaps a reversed range", () => {
    expect(sanitizeDateRange("nope", "2026-10-19")).toEqual({ from: undefined, to: "2026-10-19" });
    const { start, endExclusive } = dateRangeBounds({ from: "2026-10-20", to: "2026-10-10" });
    expect(start!.toISOString()).toBe("2026-10-09T20:30:00.000Z");
    expect(endExclusive!.toISOString()).toBe("2026-10-20T20:30:00.000Z");
  });
});

const NOW = new Date("2026-10-19T12:00:00Z");
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000);

function coupon(overrides: Partial<AdminCouponRow>): AdminCouponRow {
  return {
    id: "c", code: "CODE", discountType: "percentage", discountValue: 10, minBasketToman: 0, startsAt: null, endsAt: null,
    usageLimit: null, perCustomerLimit: 1, isActive: true, createdAt: NOW, updatedAt: NOW, redemptionCount: 0, ...overrides,
  } as AdminCouponRow;
}

describe("coupon filtering", () => {
  const coupons = [
    coupon({ id: "1", code: "AUTUMN20" }),
    coupon({ id: "2", code: "OLD10", endsAt: day(-1) }),
    coupon({ id: "3", code: "FULL5", usageLimit: 5, redemptionCount: 5 }),
    coupon({ id: "4", code: "SOON", startsAt: day(2), isActive: false, discountType: "fixed", discountValue: 50000 }),
  ];
  it("derives validity with expired › exhausted › not started precedence", () => {
    expect(couponValidity(coupons[1]!, NOW)).toBe("expired");
    expect(couponValidity(coupons[2]!, NOW)).toBe("exhausted");
    expect(couponValidity(coupons[3]!, NOW)).toBe("not_started");
    expect(couponValidity(coupons[0]!, NOW)).toBe("valid");
  });
  it("searches codes case-insensitively and combines filters", () => {
    expect(filterCoupons(coupons, parseCouponFilter({ q: "autumn" }), NOW).map((c) => c.id)).toEqual(["1"]);
    expect(filterCoupons(coupons, parseCouponFilter({ type: "fixed" }), NOW).map((c) => c.id)).toEqual(["4"]);
    expect(filterCoupons(coupons, parseCouponFilter({ active: "off" }), NOW).map((c) => c.id)).toEqual(["4"]);
    expect(filterCoupons(coupons, parseCouponFilter({ validity: "expired" }), NOW).map((c) => c.id)).toEqual(["2"]);
  });
  it("ignores unknown enum values instead of filtering by them", () => {
    expect(filterCoupons(coupons, parseCouponFilter({ validity: "bogus", type: "x" }), NOW)).toHaveLength(4);
  });
  it("counts per validity", () => {
    expect(countCouponsByValidity(coupons, NOW)).toEqual({ valid: 1, not_started: 1, expired: 1, exhausted: 1 });
  });
});

function brand(overrides: Partial<AdminBrandRow>): AdminBrandRow {
  return { id: "b", slug: "b", name: "B", nameEn: null, description: null, logoUrl: null, countryOfOrigin: null, displayOrder: 0, isActive: true, productCount: 1, ...overrides };
}

describe("brand filtering", () => {
  const brands = [
    brand({ id: "1", name: "نایک", nameEn: "Nike", slug: "nike", countryOfOrigin: "آمریکا" }),
    brand({ id: "2", name: "آدیداس", nameEn: "Adidas", slug: "adidas", countryOfOrigin: "آلمان", isActive: false }),
    brand({ id: "3", name: "ایرانی", slug: "irani", countryOfOrigin: "ایران", productCount: 0 }),
  ];
  it("searches Persian name, English name, slug and country", () => {
    expect(filterBrands(brands, parseBrandFilter({ q: "NIKE" })).map((b) => b.id)).toEqual(["1"]);
    expect(filterBrands(brands, parseBrandFilter({ q: "آدی" })).map((b) => b.id)).toEqual(["2"]);
    expect(filterBrands(brands, parseBrandFilter({ q: "ایران" })).map((b) => b.id)).toEqual(["3"]);
  });
  it("filters status, product presence and country", () => {
    expect(filterBrands(brands, parseBrandFilter({ status: "inactive" })).map((b) => b.id)).toEqual(["2"]);
    expect(filterBrands(brands, parseBrandFilter({ products: "without" })).map((b) => b.id)).toEqual(["3"]);
    expect(filterBrands(brands, parseBrandFilter({ country: "آلمان" })).map((b) => b.id)).toEqual(["2"]);
    expect(brandCountries(brands)).toHaveLength(3);
  });
});

function cat(id: string, parentId: string | null, depth: number, overrides: Partial<AdminCategoryRow> = {}): AdminCategoryRow {
  return {
    id, slug: id, name: id, description: null, imageUrl: null, parentId, parentName: parentId, displayOrder: 0,
    isActive: true, depth, productCount: 0, subtreeProductCount: 0, ...overrides,
  };
}

describe("category filtering", () => {
  const rows = [
    cat("men", null, 1, { subtreeProductCount: 2 }),
    cat("men-clothes", "men", 2, { subtreeProductCount: 2 }),
    cat("men-shirt", "men-clothes", 3, { productCount: 2, subtreeProductCount: 2 }),
    cat("men-pants", "men-clothes", 3, { isActive: false }),
    cat("women", null, 1),
  ];
  it("returns everything untouched when no filter is active", () => {
    expect(filterCategoryRows(rows, parseCategoryFilter({})).rows).toHaveLength(5);
  });
  it("keeps ancestors of a deep match so the tree stays readable", () => {
    const result = filterCategoryRows(rows, parseCategoryFilter({ q: "shirt" }));
    expect(result.rows.map((r) => r.id)).toEqual(["men", "men-clothes", "men-shirt"]);
    expect([...result.contextIds].sort()).toEqual(["men", "men-clothes"]);
    expect(result.matchCount).toBe(1);
  });
  it("filters by level, status and product presence", () => {
    expect(filterCategoryRows(rows, parseCategoryFilter({ level: "3" })).matchCount).toBe(2);
    expect(filterCategoryRows(rows, parseCategoryFilter({ status: "inactive" })).rows.map((r) => r.id)).toEqual(["men", "men-clothes", "men-pants"]);
    expect(filterCategoryRows(rows, parseCategoryFilter({ products: "without", level: "3" })).rows.map((r) => r.id)).toContain("men-pants");
  });
  it("does not loop on a parent cycle", () => {
    const cyclic = [cat("a", "b", 1), cat("b", "a", 1)];
    expect(filterCategoryRows(cyclic, parseCategoryFilter({ q: "a" })).rows).toHaveLength(2);
  });
});

function campaign(overrides: Partial<AdminCampaignListItem["row"]> & { summary?: string }): AdminCampaignListItem {
  const { summary, ...row } = overrides;
  return {
    row: {
      id: "x", name: "کمپین", slug: "x", description: null, kind: "percent_off", config: {}, appliesToAll: false, stackable: false,
      showCountdown: false, isActive: true, homePlacement: "none", homeImageUrl: null, homeBannerTone: "pink", homeTitle: null,
      homeDescription: null, homeCtaLabel: null, startsAt: null, endsAt: null, createdAt: NOW, updatedAt: NOW, ...row,
    } as AdminCampaignListItem["row"],
    summary: summary ?? "۲۰٪ تخفیف", configValid: true, brandCount: 0, categoryCount: 0, productCount: 0, excludedCount: 0, orderCount: 0, discountGivenToman: 0,
  };
}

describe("campaign filtering", () => {
  const items = [
    campaign({ id: "1", name: "حراج پاییزه", slug: "autumn" }),
    campaign({ id: "2", name: "حراج زمستانه", slug: "winter", startsAt: day(5) }),
    campaign({ id: "3", name: "قدیمی", slug: "old", endsAt: day(-3) }),
    campaign({ id: "4", name: "متوقف", slug: "paused", isActive: false, kind: "buy_x_get_y_free", homePlacement: "hero" }),
  ];
  it("derives status and counts per status", () => {
    expect(countCampaignsByStatus(items, NOW)).toEqual({ live: 1, scheduled: 1, ended: 1, paused: 1 });
  });
  it("filters by status, kind, home placement and search text", () => {
    expect(filterCampaigns(items, parseCampaignFilter({ status: "scheduled" }), NOW).map((i) => i.row.id)).toEqual(["2"]);
    expect(filterCampaigns(items, parseCampaignFilter({ kind: "buy_x_get_y_free" }), NOW).map((i) => i.row.id)).toEqual(["4"]);
    expect(filterCampaigns(items, parseCampaignFilter({ home: "hero" }), NOW).map((i) => i.row.id)).toEqual(["4"]);
    expect(filterCampaigns(items, parseCampaignFilter({ q: "زمستان" }), NOW).map((i) => i.row.id)).toEqual(["2"]);
    expect(filterCampaigns(items, parseCampaignFilter({ q: "بخر" }), NOW).map((i) => i.row.id)).toEqual(["4"]);
  });
});
