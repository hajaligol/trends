import { describe, expect, it } from "vitest";
import {
  isValidProductSlug,
  MAX_SLUG_LENGTH,
  normalizeSlugParam,
  pickAvailableSlug,
  productHref,
  slugifyTitle,
} from "@/domains/catalog/slug";
import { buildVariantSku, colorToken, sizeToken } from "@/domains/catalog/sku";
import { COLOR_PALETTE, findPaletteColor, getPaletteColor } from "@/domains/catalog/color-palette";
import { toLatinDigits } from "@/lib/utils/digits";
import { bulkVariantsSchema, parseBulkVariantsField, productSchema, productVariantSchema } from "@/lib/validation/admin";

describe("slugifyTitle (Persian slugs)", () => {
  it("keeps the Persian words of the title, joined by dashes", () => {
    expect(slugifyTitle("پیراهن کلاسیک مردانه")).toBe("پیراهن-کلاسیک-مردانه");
    expect(slugifyTitle("هودی روزانه")).toBe("هودی-روزانه");
    expect(slugifyTitle("پالتو ترنج")).toBe("پالتو-ترنج");
  });

  it("turns ZWNJ into a dash instead of keeping an invisible character", () => {
    expect(slugifyTitle("شلوار پارچه\u200cای")).toBe("شلوار-پارچه-ای");
    expect(slugifyTitle("کوله\u200cپشتی")).toBe("کوله-پشتی");
    expect(slugifyTitle("شلوار پارچه\u200cای")).not.toContain("\u200c");
  });

  it("folds Arabic look-alike letters so one title has one slug", () => {
    expect(slugifyTitle("كفش ورزشي")).toBe(slugifyTitle("کفش ورزشی"));
    expect(slugifyTitle("كفش ورزشي")).toBe("کفش-ورزشی");
  });

  it("converts Persian and Arabic-Indic digits to ASCII digits", () => {
    expect(slugifyTitle("نایک ایرمکس ۹۰")).toBe("نایک-ایرمکس-90");
    expect(slugifyTitle("تیشرت ١٢٣")).toBe("تیشرت-123");
  });

  it("keeps Latin brand names, lowercased", () => {
    expect(slugifyTitle("Nike Air Max 90")).toBe("nike-air-max-90");
    expect(slugifyTitle("کفش Nike مردانه")).toBe("کفش-nike-مردانه");
  });

  it("drops punctuation, diacritics, tatweel and emoji; collapses separators", () => {
    expect(slugifyTitle("  کت / شلوار!! (ست) ")).toBe("کت-شلوار-ست");
    expect(slugifyTitle("هُودی")).toBe("هودی");
    expect(slugifyTitle("هــودی")).toBe("هودی");
    expect(slugifyTitle("a__b--c")).toBe("a-b-c");
    expect(slugifyTitle("😀")).toBe("");
    expect(slugifyTitle("***")).toBe("");
  });

  it("always yields a valid slug or an empty string", () => {
    for (const title of ["***", "  ", "!!! پیراهن !!!", "کت / شلوار", "😀", "a__b--c", "ۀ ة أ ٱ", "ﻻ"]) {
      const slug = slugifyTitle(title);
      expect(slug === "" || isValidProductSlug(slug), title).toBe(true);
    }
  });

  it("is idempotent: slugifying a slug gives the same slug", () => {
    for (const title of ["پیراهن کلاسیک مردانه", "Nike Air Max 90", "شلوار پارچه\u200cای ۲"]) {
      const slug = slugifyTitle(title);
      expect(slugifyTitle(slug)).toBe(slug);
    }
  });

  it("caps very long titles without leaving a trailing dash", () => {
    const slug = slugifyTitle("پیراهن ".repeat(60));
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith("-")).toBe(false);
    expect(isValidProductSlug(slug)).toBe(true);
  });
});

describe("product slug validation and URLs", () => {
  it("accepts Persian/ASCII slugs and rejects spaces, uppercase, slashes and bad dashes", () => {
    for (const ok of ["پیراهن-کلاسیک", "shirt-2", "کت-جین-3", "nike-90"]) expect(isValidProductSlug(ok), ok).toBe(true);
    for (const bad of ["", "Bad Slug", "پیراهن کلاسیک", "Shirt", "a/b", "-a", "a-", "a--b", "a\u200cb", "../x", "a%20b"]) {
      expect(isValidProductSlug(bad), bad).toBe(false);
    }
  });

  it("productHref percent-encodes the slug so absolute URLs are valid ASCII", () => {
    const href = productHref("پیراهن-کلاسیک");
    expect(href.startsWith("/product/%D9%BE")).toBe(true);
    expect(/^[\x20-\x7e]+$/.test(href)).toBe(true);
    expect(decodeURIComponent(href.slice("/product/".length))).toBe("پیراهن-کلاسیک");
    expect(productHref("shirt-2")).toBe("/product/shirt-2");
  });

  it("normalizeSlugParam decodes encoded params, tolerates bad escapes and composes to NFC", () => {
    expect(normalizeSlugParam("%D9%BE%DB%8C%D8%B1%D8%A7%D9%87%D9%86")).toBe("پیراهن");
    expect(normalizeSlugParam("پیراهن")).toBe("پیراهن");
    expect(normalizeSlugParam("%E0%A4%A")).toBe("%E0%A4%A"); // malformed: no throw
    expect(normalizeSlugParam("e\u0301")).toBe("\u00e9");
  });
});

describe("pickAvailableSlug", () => {
  it("returns the base when free and numbers collisions", async () => {
    expect(await pickAvailableSlug("shirt", async () => false)).toBe("shirt");
    const taken = new Set(["shirt", "shirt-2"]);
    expect(await pickAvailableSlug("shirt", async (slug) => taken.has(slug))).toBe("shirt-3");
  });
});

describe("variant SKU", () => {
  it("is <code>-<SIZE>-<COLOR>", () => {
    expect(buildVariantSku(100042, "M", { name: "مشکی", hex: "#1A1A1A" })).toBe("100042-M-BLK");
    expect(buildVariantSku(100042, "xl", { name: "سرمه‌ای", hex: "#1F2D4D" })).toBe("100042-XL-NVY");
    expect(buildVariantSku(100042, "42", { name: "سفید", hex: "#FFFFFF" })).toBe("100042-42-WHT");
  });

  it("handles free size, custom Persian sizes and legacy colours", () => {
    expect(sizeToken("فری‌سایز")).toBe("FREE");
    expect(sizeToken("فری سایز")).toBe("FREE");
    expect(sizeToken("۲ سال")).toMatch(/^[A-Z0-9]+$/);
    expect(colorToken({ name: "رنگ قدیمی", hex: "#7C6A54" })).toBe("C7C6A54");
    expect(colorToken({ name: "قرمز", hex: null })).toBe("RED");
  });

  it("stays ASCII even though product slugs are Persian (off-palette names, odd sizes)", () => {
    expect(colorToken({ name: "سبز زمردی", hex: null })).toMatch(/^[A-Z0-9]+$/);
    expect(sizeToken("بزرگ")).toMatch(/^[A-Z0-9]+$/);
    expect(buildVariantSku(100042, "۲ سال", { name: "سبز زمردی", hex: null })).toMatch(/^[A-Z0-9-]+$/);
  });

  it("is ASCII-only and uses only [A-Z0-9-]", () => {
    for (const color of COLOR_PALETTE) {
      expect(buildVariantSku(100001, "XXL", color)).toMatch(/^[A-Z0-9-]+$/);
    }
  });
});

describe("colour palette", () => {
  it("has unique codes, names and valid hex values", () => {
    expect(new Set(COLOR_PALETTE.map((c) => c.code)).size).toBe(COLOR_PALETTE.length);
    expect(new Set(COLOR_PALETTE.map((c) => c.name)).size).toBe(COLOR_PALETTE.length);
    expect(new Set(COLOR_PALETTE.map((c) => c.hex.toLowerCase())).size).toBe(COLOR_PALETTE.length);
    for (const color of COLOR_PALETTE) expect(color.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("looks colours up by code and by stored name/hex", () => {
    expect(getPaletteColor("BLK")?.name).toBe("مشکی");
    expect(getPaletteColor("NOPE")).toBeUndefined();
    expect(findPaletteColor({ name: "مشکی", hex: "#1a1a1a" })?.code).toBe("BLK");
    expect(findPaletteColor({ name: "ناشناخته", hex: "#123456" })).toBeUndefined();
  });
});

describe("toLatinDigits", () => {
  it("converts Persian and Arabic-Indic digits", () => {
    expect(toLatinDigits("۱۰۰۰۴۲")).toBe("100042");
    expect(toLatinDigits("١٠٠٠٤٢ abc")).toBe("100042 abc");
  });
});

describe("product validation", () => {
  const base = { title: "پیراهن", categoryId: "3f0f6a54-9f4f-4a43-9d57-0a4d5d3a4c11" };

  it("does not require a slug (it is generated)", () => {
    const parsed = productSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.slug).toBeNull();
  });

  it("still rejects a malformed slug when one is supplied", () => {
    expect(productSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, slug: "پیراهن کلاسیک" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, slug: "good-slug" }).success).toBe(true);
    expect(productSchema.safeParse({ ...base, slug: "پیراهن-کلاسیک" }).success).toBe(true);
  });

  it("variant edit schema has no sku input and requires a colour code", () => {
    const parsed = productVariantSchema.safeParse({ size: "M", colorCode: "BLK", priceToman: "1000", stock: "3" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect("sku" in parsed.data).toBe(false);
    expect(productVariantSchema.safeParse({ size: "M", priceToman: "1000", stock: "3" }).success).toBe(false);
  });
});

describe("bulk variants payload", () => {
  const row = { size: "M", colorCode: "BLK", priceToman: 1000, compareAtPriceToman: null, stock: 3 };

  it("accepts a valid matrix", () => {
    const parsed = bulkVariantsSchema.safeParse({ material: "", lowStockThreshold: 5, isActive: true, rows: [row] });
    expect(parsed.success).toBe(true);
  });

  it("rejects a blank price instead of treating it as 0", () => {
    expect(bulkVariantsSchema.safeParse({ rows: [{ ...row, priceToman: null }] }).success).toBe(false);
    expect(bulkVariantsSchema.safeParse({ rows: [{ ...row, priceToman: "" }] }).success).toBe(false);
  });

  it("rejects negatives, fractions, empty and oversized matrices", () => {
    expect(bulkVariantsSchema.safeParse({ rows: [{ ...row, stock: -1 }] }).success).toBe(false);
    expect(bulkVariantsSchema.safeParse({ rows: [{ ...row, priceToman: 10.5 }] }).success).toBe(false);
    expect(bulkVariantsSchema.safeParse({ rows: [] }).success).toBe(false);
    expect(bulkVariantsSchema.safeParse({ rows: Array.from({ length: 151 }, () => row) }).success).toBe(false);
  });

  it("parseBulkVariantsField treats blank as 'no variants' and bad JSON as an error", () => {
    expect(parseBulkVariantsField(null)).toEqual({ ok: true, value: null });
    expect(parseBulkVariantsField("")).toEqual({ ok: true, value: null });
    expect(parseBulkVariantsField("{oops").ok).toBe(false);
    expect(parseBulkVariantsField(JSON.stringify({ rows: [row] })).ok).toBe(true);
  });
});
