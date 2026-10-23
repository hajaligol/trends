import { describe, expect, it } from "vitest";
import { isHostedAssetPath } from "@/lib/utils/asset-path";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { heroSlideSchema, promoBannerSchema, productImageSchema } from "@/lib/validation/admin";

describe("isHostedAssetPath", () => {
  it("accepts uploaded asset paths only", () => {
    expect(isHostedAssetPath("/assets/products/a-1.webp")).toBe(true);
    for (const bad of ["https://evil.test/a.png", "//evil.test/a.png", "javascript:alert(1)", "/assets/../etc/passwd", "/other/a.png", "", null, undefined]) {
      expect(isHostedAssetPath(bad as string | null | undefined)).toBe(false);
    }
  });
});

describe("admin content schemas", () => {
  it("rejects external/unsafe image URLs and unsafe CTA links", () => {
    const base = { alt: "x", displayOrder: 0 };
    expect(heroSlideSchema.safeParse({ ...base, imageUrl: "https://evil.test/a.png" }).success).toBe(false);
    expect(heroSlideSchema.safeParse({ ...base, imageUrl: "/assets/hero/a.webp", ctaHref: "javascript:alert(1)" }).success).toBe(false);
    expect(heroSlideSchema.safeParse({ ...base, imageUrl: "/assets/hero/a.webp", ctaHref: "//evil.test" }).success).toBe(false);
    const withImages = { ...base, imageUrl: "/assets/hero/a.webp", mobileImageUrl: "/assets/hero/a-m.webp", ctaHref: "/category/women" };
    expect(heroSlideSchema.safeParse(withImages).success).toBe(true);
    // The phone image is mandatory and must be a hosted upload too.
    expect(heroSlideSchema.safeParse({ ...withImages, mobileImageUrl: "" }).success).toBe(false);
    expect(heroSlideSchema.safeParse({ ...withImages, mobileImageUrl: undefined }).success).toBe(false);
    expect(heroSlideSchema.safeParse({ ...withImages, mobileImageUrl: "https://evil.test/a.png" }).success).toBe(false);
    expect(
      promoBannerSchema.safeParse({
        tone: "pink", title: "t", description: "d", ctaLabel: "c", imageUrl: "data:image/png;base64,AAAA",
      }).success,
    ).toBe(false);
    expect(productImageSchema.safeParse({ url: "http://x.test/a.png", altText: "a" }).success).toBe(false);
  });
});

describe("checkRateLimit", () => {
  it("blocks after the limit within a window", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(false);
  });
});
