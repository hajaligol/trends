import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, productSlugRedirects, productVariants, products } from "@/lib/db/schema";
import {
  generateProductSlug,
  insertVariantsBulk,
  isSlugTakenByOther,
  recordSlugRedirect,
  VariantInputError,
} from "@/domains/catalog/product-service";
import { isValidProductSlug } from "@/domains/catalog/slug";
import { getCurrentSlugForFormerSlug, getProductDetailBySlug, searchProducts } from "@/domains/catalog/queries";
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

describe("generateProductSlug (Persian slugs)", () => {
  it("derives a Persian slug from the title and numbers collisions", async () => {
    const title = `پیراهن کلاسیک مردانه t${Date.now()}`;
    const first = await generateProductSlug(title);
    expect(first.startsWith("پیراهن-کلاسیک-مردانه-t")).toBe(true);
    expect(isValidProductSlug(first)).toBe(true);

    const product = await newProduct({ slug: first });
    expect(product.slug).toBe(first);
    const second = await generateProductSlug(title);
    expect(second).toBe(`${first}-2`);
  });

  it("falls back to a generic Persian slug when the title has no usable letters", async () => {
    const slug = await generateProductSlug("😀");
    expect(slug).toMatch(/^محصول(-\d+)?$/);
  });

  it("can keep a product's own slug when regenerating for that product", async () => {
    const title = `هودی روزانه t${Date.now()}`;
    const slug = await generateProductSlug(title);
    const product = await newProduct({ slug, title });
    expect(await generateProductSlug(title, db, product.id)).toBe(slug);
  });
});

describe("product slug redirects", () => {
  it("records the old slug and resolves it to the current slug (active products only)", async () => {
    const token = `t${Date.now()}`;
    const oldSlug = `old-${token}`;
    const product = await newProduct({ slug: oldSlug });
    const newSlug = `پیراهن-${token}`;

    await db.transaction(async (tx) => {
      await tx.update(products).set({ slug: newSlug }).where(eq(products.id, product.id));
      await recordSlugRedirect(tx, product.id, oldSlug, newSlug);
    });

    expect(await getCurrentSlugForFormerSlug(oldSlug)).toBe(newSlug);
    // Also works for the percent-encoded form a router may hand us.
    expect(await getCurrentSlugForFormerSlug(encodeURIComponent(oldSlug))).toBe(newSlug);
    expect(await getCurrentSlugForFormerSlug(`never-existed-${token}`)).toBeNull();

    // A deactivated product must 404, not redirect.
    await db.update(products).set({ isActive: false }).where(eq(products.id, product.id));
    expect(await getCurrentSlugForFormerSlug(oldSlug)).toBeNull();
  });

  it("resolves a product by its Persian slug, raw or percent-encoded", async () => {
    const slug = `کت-جین-t${Date.now()}`;
    const product = await newProduct({ slug });
    expect((await getProductDetailBySlug(slug))?.id).toBe(product.id);
    expect((await getProductDetailBySlug(encodeURIComponent(slug)))?.id).toBe(product.id);
    expect(await getProductDetailBySlug("%E0%A4%A")).toBeNull(); // malformed escape: no throw
  });

  it("reserves a former slug: neither a new title nor an admin edit can take it", async () => {
    const token = `t${Date.now()}`;
    const oldSlug = `کفش-قدیمی-${token}`;
    const owner = await newProduct({ slug: `کفش-جدید-${token}` });
    await recordSlugRedirect(db, owner.id, oldSlug, `کفش-جدید-${token}`);

    // A new product titled the same gets -2 instead of hijacking the redirect.
    expect(await generateProductSlug(`کفش قدیمی ${token}`)).toBe(`${oldSlug}-2`);

    const other = await newProduct();
    expect(await isSlugTakenByOther(oldSlug, other.id)).toBe(true);
    expect(await isSlugTakenByOther(oldSlug, owner.id)).toBe(false);
  });

  it("returning to a former slug removes its now-pointless redirect row", async () => {
    const token = `t${Date.now()}`;
    const a = `الف-${token}`;
    const b = `ب-${token}`;
    const product = await newProduct({ slug: b });
    await recordSlugRedirect(db, product.id, a, b); // a → b
    await recordSlugRedirect(db, product.id, b, a); // product goes back to a
    const rows = await db.select().from(productSlugRedirects).where(eq(productSlugRedirects.productId, product.id));
    expect(rows.map((r) => r.oldSlug)).toEqual([b]);
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
