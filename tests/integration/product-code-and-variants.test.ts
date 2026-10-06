import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, productVariants, products } from "@/lib/db/schema";
import { generateProductSlug, insertVariantsBulk, VariantInputError } from "@/domains/catalog/product-service";
import { searchProducts } from "@/domains/catalog/queries";
import { listProductsForAdmin } from "@/domains/catalog/admin-queries";
import { bulkVariantsSchema } from "@/lib/validation/admin";
import { createTestCategory, createTestProduct } from "./helpers";

const productIds: string[] = [];
const categoryIds: string[] = [];

afterAll(async () => {
  if (productIds.length) await db.delete(products).where(inArray(products.id, productIds));
  for (const id of categoryIds) await db.delete(categories).where(eq(categories.id, id));
});

async function newProduct(overrides: Partial<typeof products.$inferInsert> = {}) {
  const category = await createTestCategory();
  categoryIds.push(category.id);
  const product = await createTestProduct(category.id, overrides);
  productIds.push(product.id);
  return product;
}

const row = (size: string, colorCode: string, priceToman = 1_000_000, stock = 4) => ({
  size,
  colorCode,
  priceToman,
  compareAtPriceToman: null,
  stock,
});

const payload = (rows: ReturnType<typeof row>[]) => bulkVariantsSchema.parse({ material: "پنبه", lowStockThreshold: 5, isActive: true, rows });

describe("product code («کد کالا»)", () => {
  it("is assigned automatically, six digits, and unique across concurrent inserts", async () => {
    const category = await createTestCategory();
    categoryIds.push(category.id);
    const created = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        db
          .insert(products)
          .values({ slug: `trends-test-code-${Date.now()}-${i}`, title: `کد ${i}`, categoryId: category.id })
          .returning({ id: products.id, code: products.productCode }),
      ),
    );
    for (const [p] of created) productIds.push(p!.id);
    const codes = created.map(([p]) => p!.code);
    expect(new Set(codes).size).toBe(8);
    for (const code of codes) expect(code).toBeGreaterThanOrEqual(100001);
  });

  it("cannot be duplicated (unique index)", async () => {
    const a = await newProduct();
    const category = await createTestCategory();
    categoryIds.push(category.id);
    await expect(
      db.insert(products).values({ slug: `trends-test-dup-${Date.now()}`, title: "x", categoryId: category.id, productCode: a.productCode }),
    ).rejects.toThrow();
  });
});

describe("generateProductSlug", () => {
  it("derives the slug from the title and numbers collisions", async () => {
    const title = `پیراهن کلاسیک مردانه`;
    const first = await generateProductSlug(title);
    expect(first.startsWith("shirt-classic-men")).toBe(true);

    const product = await newProduct({ slug: first });
    expect(product.slug).toBe(first);
    const second = await generateProductSlug(title);
    expect(second).not.toBe(first);
    expect(second.startsWith(first)).toBe(true);
  });

  it("falls back to a generic slug when the title has no usable letters", async () => {
    const slug = await generateProductSlug("😀");
    expect(slug).toMatch(/^product(-\d+)?$/);
  });
});

describe("insertVariantsBulk", () => {
  it("creates every size × colour with SKUs built from the product code", async () => {
    const product = await newProduct();
    const result = await db.transaction((tx) =>
      insertVariantsBulk(tx, product, payload([row("S", "BLK"), row("S", "WHT"), row("M", "BLK"), row("M", "WHT")])),
    );
    expect(result).toEqual({ created: 4, skipped: 0 });

    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, product.id));
    expect(variants.map((v) => v.sku).sort()).toEqual(
      [`${product.productCode}-M-BLK`, `${product.productCode}-M-WHT`, `${product.productCode}-S-BLK`, `${product.productCode}-S-WHT`].sort(),
    );
    const black = variants.find((v) => v.sku.endsWith("-S-BLK"))!;
    // Name and hex come from the server palette, never from the request.
    expect(black.color).toBe("مشکی");
    expect(black.colorHex).toBe("#1A1A1A");
    expect(black.material).toBe("پنبه");
    expect(black.priceToman).toBe(1_000_000);
  });

  it("skips combinations that already exist instead of failing", async () => {
    const product = await newProduct();
    await db.transaction((tx) => insertVariantsBulk(tx, product, payload([row("M", "BLK")])));
    const second = await db.transaction((tx) => insertVariantsBulk(tx, product, payload([row("M", "BLK"), row("L", "BLK")])));
    expect(second).toEqual({ created: 1, skipped: 1 });
    const all = await db.select().from(productVariants).where(eq(productVariants.productId, product.id));
    expect(all).toHaveLength(2);
  });

  it("ignores a duplicated pair inside one payload", async () => {
    const product = await newProduct();
    const result = await db.transaction((tx) => insertVariantsBulk(tx, product, payload([row("M", "RED"), row("M", "RED")])));
    expect(result).toEqual({ created: 1, skipped: 0 });
  });

  it("rejects an unknown palette colour and writes nothing (transaction rolls back)", async () => {
    const product = await newProduct();
    await expect(
      db.transaction((tx) => insertVariantsBulk(tx, product, payload([row("M", "BLK"), row("M", "NOPE")]))),
    ).rejects.toBeInstanceOf(VariantInputError);
    const all = await db.select().from(productVariants).where(eq(productVariants.productId, product.id));
    expect(all).toHaveLength(0);
  });
});

describe("searching by product code", () => {
  it("finds an active product on the storefront by its exact code (Persian or Latin digits)", async () => {
    const product = await newProduct({ title: "محصول بدون ربط متنی کد" });
    await db.transaction((tx) => insertVariantsBulk(tx, product, payload([row("M", "BLK")])));

    const latin = await searchProducts({ q: String(product.productCode) });
    expect(latin.products.map((p) => p.slug)).toContain(product.slug);

    const persian = await searchProducts({ q: String(product.productCode).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!) });
    expect(persian.products.map((p) => p.slug)).toContain(product.slug);

    // A partial code must NOT match on the storefront.
    const partial = await searchProducts({ q: String(product.productCode).slice(0, 4) });
    expect(partial.products.map((p) => p.slug)).not.toContain(product.slug);
  });

  it("does not expose inactive products through a code search", async () => {
    const product = await newProduct({ isActive: false });
    const result = await searchProducts({ q: String(product.productCode) });
    expect(result.products.map((p) => p.slug)).not.toContain(product.slug);
  });

  it("finds products in the admin by code (prefix), Persian digits and SKU", async () => {
    const product = await newProduct({ isActive: false });
    await db.transaction((tx) => insertVariantsBulk(tx, product, payload([row("XL", "NVY")])));

    const byCode = await listProductsForAdmin({ search: String(product.productCode) });
    expect(byCode.rows.map((r) => r.id)).toContain(product.id);

    const byPersianPrefix = await listProductsForAdmin({
      search: String(product.productCode).slice(0, 5).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!),
    });
    expect(byPersianPrefix.rows.map((r) => r.id)).toContain(product.id);

    const bySku = await listProductsForAdmin({ search: `${product.productCode}-XL-NVY` });
    expect(bySku.rows.map((r) => r.id)).toContain(product.id);

    const none = await listProductsForAdmin({ search: "999999999" });
    expect(none.rows.map((r) => r.id)).not.toContain(product.id);
  });
});
