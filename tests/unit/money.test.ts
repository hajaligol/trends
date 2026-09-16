import { describe, expect, it } from "vitest";
import { discountPercent, formatToman } from "@/lib/utils/money";

describe("formatToman", () => {
  it("formats an integer amount with thousands separators and Persian digits", () => {
    expect(formatToman(590000)).toBe("۵۹۰,۰۰۰ تومان");
  });

  it("formats zero", () => {
    expect(formatToman(0)).toBe("۰ تومان");
  });

  it("rounds non-integer input rather than truncating (defense against a caller passing a float)", () => {
    // Money is documented as always integer Toman (TRENDS_PROJECT_CONTEXT.md
    // §5), but this is presentation-layer defensiveness for whatever
    // slips through.
    expect(formatToman(1999.6)).toBe("۲,۰۰۰ تومان");
  });

  it("formats large amounts with multiple separator groups", () => {
    expect(formatToman(12345678)).toBe("۱۲,۳۴۵,۶۷۸ تومان");
  });
});

describe("discountPercent", () => {
  it("returns the rounded percentage off when compare-at exceeds price", () => {
    expect(discountPercent(1000000, 750000)).toBe(25);
  });

  it("returns 0 when there is no compare-at price", () => {
    expect(discountPercent(null, 750000)).toBe(0);
  });

  it("returns 0 when compare-at equals the price (no real discount)", () => {
    expect(discountPercent(750000, 750000)).toBe(0);
  });

  it("returns 0 when compare-at is lower than the price (never shows a negative discount)", () => {
    expect(discountPercent(500000, 750000)).toBe(0);
  });

  it("returns 0 when compare-at is zero or negative (defensive against bad data)", () => {
    expect(discountPercent(0, 750000)).toBe(0);
    expect(discountPercent(-100, 750000)).toBe(0);
  });

  it("rounds to the nearest whole percent", () => {
    // (1000 - 666) / 1000 = 33.4% -> rounds to 33
    expect(discountPercent(1000, 666)).toBe(33);
  });
});
