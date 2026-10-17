import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { brands, categories, products } from "@/lib/db/schema";
import { getProductDetailBySlug, searchProducts } from "@/domains/catalog/queries";
import {
  countProductsOfBrand,
  getProductBrandError,
  isBrandNameTaken,
  listBrandOptions,
  listBrandsForAdmin,
  listStorefrontBrands,
} from "@/domains/brands/queries";
import { generateBrandSlug } from "@/domains/brands/slug";
import { createTestCategory, createTestProductWithVariant } from "./helpers";

const brandIds: string[] = [];
const productIds: string[] = [];
const categoryIds: string[] = [];

afterAll(async () => {
  if (productIds.length) await db.delete(products).where(inArray(products.id, productIds));
  if (brandIds.length) await db.delete(brands).where(inArray(brands.id, brandIds));
  for (const id of categoryIds) await db.delete(categories).where(eq(categories.id, id));
});

let n = 0;
async function makeBrand(overrides: Partial<typeof brands.$inferInsert> = {}) {
  n += 1;
  const tag = `${Date.now().toString(36)}${n}`;
  const [row] = await db
    .insert(brands)
    .values({ name: `برند-آزمایشی-${tag}`, slug: `trends-test-brand-${tag}`, ...overrides })
    .returning();
  if (!row) throw new Error("brand insert returned no row");
  brandIds.push(row.id);
  return { brand: row, tag };
}

async function makeProduct(brandId: string | null, overrides: Partial<typeof products.$inferInsert> = {}) {
  const category = await createTestCategory();
  categoryIds.push(category.id);
  const { product } = await createTestProductWithVariant(category.id);
  await db.update(products).set({ brandId, ...overrides }).where(eq(products.id, product.id));
  productIds.push(product.id);
  return product;
}

describe("brand constraints", () => {
  it("rejects a case-insensitive duplicate name at the database level", async () => {
    const { brand } = await makeBrand({ name: "TrendsTestDup" });
    expect(await isBrandNameTaken("trendstestdup")).toBe(true);
    expect(await isBrandNameTaken("trendstestdup", brand.id)).toBe(false);
    await expect(
      db.insert(brands).values({ name: "trendstestDUP", slug: "trends-test-dup-other" }),
    ).rejects.toThrow();
  });

  it("rejects a duplicate slug at the database level", async () => {
    const { brand, tag } = await makeBrand();
    await expect(db.insert(brands).values({ name: `دیگر-${tag}`, slug: brand.slug })).rejects.toThrow();
  });

  it("refuses to delete a brand that still has products (ON DELETE RESTRICT)", async () => {
    const { brand } = await makeBrand();
    await makeProduct(brand.id);
    expect(await countProductsOfBrand(brand.id)).toBe(1);
    await expect(db.delete(brands).where(eq(brands.id, brand.id))).rejects.toThrow();
  });

  it("generates a free slug, adding a suffix on a clash", async () => {
    const { brand } = await makeBrand({ name: "نایک تست", nameEn: "Nike Trends Test", slug: "nike-trends-test" });
    expect(brand.slug).toBe("nike-trends-test");
    expect(await generateBrandSlug("نایک تست", "Nike Trends Test")).toBe("nike-trends-test-2");
  });
});

describe("product brand selection rules", () => {
  it("allows no brand and any active brand", async () => {
    const { brand } = await makeBrand();
    expect(await getProductBrandError(null)).toBeNull();
    expect(await getProductBrandError(brand.id)).toBeNull();
  });

  it("rejects an unknown brand", async () => {
    expect(await getProductBrandError("3f2504e0-4f89-41d3-9a0c-0305e82c3399")).toMatch(/یافت نشد/);
  });

  it("rejects newly assigning an inactive brand but lets a product keep it", async () => {
    const { brand } = await makeBrand({ isActive: false });
    expect(await getProductBrandError(brand.id)).toMatch(/غیرفعال/);
    expect(await getProductBrandError(brand.id, brand.id)).toBeNull();
  });

  it("offers only active brands in the picker, plus the product's own inactive one", async () => {
    const { brand: active } = await makeBrand();
    const { brand: inactive } = await makeBrand({ isActive: false });
    const plain = await listBrandOptions();
    expect(plain.some((option) => option.id === active.id)).toBe(true);
    expect(plain.some((option) => option.id === inactive.id)).toBe(false);
    const withCurrent = await listBrandOptions(inactive.id);
    expect(withCurrent.find((option) => option.id === inactive.id)?.isActive).toBe(false);
  });

  it("counts products per brand in the admin list", async () => {
    const { brand } = await makeBrand();
    await makeProduct(brand.id);
    await makeProduct(brand.id);
    const row = (await listBrandsForAdmin()).find((item) => item.id === brand.id);
    expect(row?.productCount).toBe(2);
  });
});

describe("storefront visibility", () => {
  it("shows an active brand on the product page", async () => {
    const { brand } = await makeBrand({ countryOfOrigin: "ایران", logoUrl: "/assets/brands/x.webp" });
    const product = await makeProduct(brand.id);
    const detail = await getProductDetailBySlug(product.slug);
    expect(detail?.brand).toMatchObject({ name: brand.name, slug: brand.slug, countryOfOrigin: "ایران", logoUrl: "/assets/brands/x.webp" });
  });

  it("hides a deactivated brand but keeps the product sellable", async () => {
    const { brand } = await makeBrand();
    const product = await makeProduct(brand.id);
    await db.update(brands).set({ isActive: false }).where(eq(brands.id, brand.id));
    const detail = await getProductDetailBySlug(product.slug);
    expect(detail).not.toBeNull();
    expect(detail?.brand).toBeNull();
  });

  it("has no brand for a product without one", async () => {
    const product = await makeProduct(null);
    expect((await getProductDetailBySlug(product.slug))?.brand).toBeNull();
  });

  it("finds products by brand name or Latin name, but not once the brand is inactive", async () => {
    const { brand, tag } = await makeBrand({ nameEn: `Latin${Date.now().toString(36)}zq` });
    const product = await makeProduct(brand.id);

    const byName = await searchProducts({ q: brand.name });
    expect(byName.products.some((item) => item.slug === product.slug)).toBe(true);
    const byLatin = await searchProducts({ q: brand.nameEn!.toLowerCase() });
    expect(byLatin.products.some((item) => item.slug === product.slug)).toBe(true);
    void tag;

    await db.update(brands).set({ isActive: false }).where(eq(brands.id, brand.id));
    const afterOff = await searchProducts({ q: brand.name });
    expect(afterOff.products.some((item) => item.slug === product.slug)).toBe(false);
  });
});

describe("storefront brand list (header dropdown and /brands)", () => {
  it("hides inactive brands, and brands without an active product when asked", async () => {
    const { brand: withProduct } = await makeBrand({ displayOrder: -2 });
    const { brand: empty } = await makeBrand({ displayOrder: -1 });
    const { brand: inactive } = await makeBrand({ isActive: false });
    await makeProduct(withProduct.id);
    await makeProduct(inactive.id);

    const all = await listStorefrontBrands();
    expect(all.map((b) => b.slug)).toContain(empty.slug);
    expect(all.map((b) => b.slug)).not.toContain(inactive.slug);
    expect(all.find((b) => b.slug === withProduct.slug)?.productCount).toBe(1);

    const forHeader = await listStorefrontBrands({ withProductsOnly: true });
    expect(forHeader.map((b) => b.slug)).toContain(withProduct.slug);
    expect(forHeader.map((b) => b.slug)).not.toContain(empty.slug);
  });

  it("breaks ties between unsold brands by the admin's display order, and honours the limit", async () => {
    const { brand: first } = await makeBrand({ displayOrder: -20 });
    const { brand: second } = await makeBrand({ displayOrder: -10 });
    const slugs = (await listStorefrontBrands()).map((b) => b.slug);
    expect(slugs.indexOf(first.slug)).toBeLessThan(slugs.indexOf(second.slug));
    expect(await listStorefrontBrands({ limit: 3 })).toHaveLength(3);
  });
});
