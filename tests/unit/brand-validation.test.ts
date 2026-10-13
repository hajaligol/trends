import { describe, expect, it } from "vitest";
import { brandSchema, productSchema } from "@/lib/validation/admin";

const base = { name: "نایک" };

describe("brandSchema", () => {
  it("accepts a minimal brand and normalizes blanks to null", () => {
    const result = brandSchema.safeParse({ ...base, nameEn: "", slug: "", description: "", logoUrl: "", countryOfOrigin: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nameEn).toBeNull();
      expect(result.data.slug).toBeNull();
      expect(result.data.logoUrl).toBeNull();
      expect(result.data.isActive).toBe(false); // an unchecked switch is simply absent
      expect(result.data.displayOrder).toBe(0);
    }
  });

  it("requires a name and trims it", () => {
    expect(brandSchema.safeParse({ name: "   " }).success).toBe(false);
    const result = brandSchema.safeParse({ name: "  زارا  " });
    expect(result.success && result.data.name).toBe("زارا");
  });

  it("reads the switch the way the other admin forms do", () => {
    const on = brandSchema.safeParse({ ...base, isActive: "on" });
    expect(on.success && on.data.isActive).toBe(true);
  });

  it("accepts Persian or Latin slugs but not spaces/uppercase", () => {
    expect(brandSchema.safeParse({ ...base, slug: "نایک" }).success).toBe(true);
    expect(brandSchema.safeParse({ ...base, slug: "nike-sport" }).success).toBe(true);
    expect(brandSchema.safeParse({ ...base, slug: "Nike Sport" }).success).toBe(false);
  });

  it("only accepts logos hosted under /assets (no external URLs, no traversal)", () => {
    expect(brandSchema.safeParse({ ...base, logoUrl: "/assets/brands/abc.webp" }).success).toBe(true);
    expect(brandSchema.safeParse({ ...base, logoUrl: "https://evil.example/x.png" }).success).toBe(false);
    expect(brandSchema.safeParse({ ...base, logoUrl: "//evil.example/x.png" }).success).toBe(false);
    expect(brandSchema.safeParse({ ...base, logoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(brandSchema.safeParse({ ...base, logoUrl: "/assets/../secret.png" }).success).toBe(false);
  });
});

describe("productSchema brand selection", () => {
  const product = { title: "تیشرت", categoryId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" };

  it("takes a brand id (uuid) or none", () => {
    const none = productSchema.safeParse({ ...product, brandId: "" });
    expect(none.success && none.data.brandId).toBeNull();
    const some = productSchema.safeParse({ ...product, brandId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302" });
    expect(some.success && some.data.brandId).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3302");
  });

  it("rejects free text where a brand id is expected", () => {
    expect(productSchema.safeParse({ ...product, brandId: "Nike" }).success).toBe(false);
  });
});
