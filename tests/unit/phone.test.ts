import { describe, expect, it } from "vitest";
import {
  formatIranianMobileForDisplay,
  normalizeIranianMobile,
  toAsciiDigits,
} from "@/lib/utils/phone";

describe("toAsciiDigits", () => {
  it("converts Persian digits to ASCII", () => {
    expect(toAsciiDigits("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });

  it("converts Arabic-Indic digits to ASCII", () => {
    expect(toAsciiDigits("٠٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
  });

  it("leaves ASCII digits and other characters untouched", () => {
    expect(toAsciiDigits("+98 912-345 6789")).toBe("+98 912-345 6789");
  });
});

describe("normalizeIranianMobile", () => {
  const canonical = "+989123456789";

  it("normalizes the everyday domestic format (0912...)", () => {
    expect(normalizeIranianMobile("09123456789")).toBe(canonical);
  });

  it("normalizes domestic without the leading 0 (912...)", () => {
    expect(normalizeIranianMobile("9123456789")).toBe(canonical);
  });

  it("normalizes already-international +98 format", () => {
    expect(normalizeIranianMobile("+989123456789")).toBe(canonical);
  });

  it("normalizes 00-prefixed international format", () => {
    expect(normalizeIranianMobile("00989123456789")).toBe(canonical);
  });

  it("normalizes Persian-digit input in any accepted shape", () => {
    expect(normalizeIranianMobile("۰۹۱۲۳۴۵۶۷۸۹")).toBe(canonical);
    expect(normalizeIranianMobile("+۹۸۹۱۲۳۴۵۶۷۸۹")).toBe(canonical);
  });

  it("normalizes input with spaces/dashes", () => {
    expect(normalizeIranianMobile("0912-345 6789")).toBe(canonical);
  });

  it("treats different input formats for the same real number as the same canonical value (the Phase 6 dedup bug this guards against)", () => {
    const variants = ["09123456789", "9123456789", "+989123456789", "00989123456789", "۰۹۱۲۳۴۵۶۷۸۹"];
    const normalized = new Set(variants.map((v) => normalizeIranianMobile(v)));
    expect(normalized.size).toBe(1);
    expect(normalized.has(canonical)).toBe(true);
  });

  it("rejects a subscriber number not starting with 9", () => {
    expect(normalizeIranianMobile("08123456789")).toBeNull();
  });

  it("rejects too few digits", () => {
    expect(normalizeIranianMobile("0912345")).toBeNull();
  });

  it("rejects too many digits", () => {
    expect(normalizeIranianMobile("091234567890")).toBeNull();
  });

  it("rejects a landline-shaped number", () => {
    expect(normalizeIranianMobile("02112345678")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(normalizeIranianMobile("not a phone number")).toBeNull();
    expect(normalizeIranianMobile("")).toBeNull();
  });
});

describe("formatIranianMobileForDisplay", () => {
  it("formats a canonical number into readable groups", () => {
    expect(formatIranianMobileForDisplay("+989123456789")).toBe("0912 345 6789");
  });

  it("falls back to the input unchanged if it isn't the expected length", () => {
    expect(formatIranianMobileForDisplay("+9891234")).toBe("+9891234");
  });
});
