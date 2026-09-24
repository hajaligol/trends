import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, productSpecifications, products } from "@/lib/db/schema";
import { listProductSpecifications, replaceProductSpecifications } from "@/domains/catalog/specifications";
import { getProductDetailBySlug } from "@/domains/catalog/queries";
import { createTestCategory, createTestProductWithVariant } from "./helpers";

const createdProductIds: string[] = [];
const createdCategoryIds: string[] = [];

afterAll(async () => {
  for (const id of createdProductIds) await db.delete(products).where(eq(products.id, id));
  for (const id of createdCategoryIds) await db.delete(categories).where(eq(categories.id, id));
});

async function fixture() {
  const category = await createTestCategory();
  createdCategoryIds.push(category.id);
  const { product } = await createTestProductWithVariant(category.id);
  createdProductIds.push(product.id);
  return product;
}

describe("product specifications", () => {
  it("saves, orders and replaces the whole set atomically", async () => {
    const product = await fixture();

    await replaceProductSpecifications(product.id, [
      { label: "قد مدل", value: "۱۸۵" },
      { label: "طرح", value: "ساده" },
    ]);
    expect(await listProductSpecifications(product.id)).toEqual([
      { label: "قد مدل", value: "۱۸۵" },
      { label: "طرح", value: "ساده" },
    ]);

    await replaceProductSpecifications(product.id, [{ label: "طرح", value: "راه‌راه" }]);
    expect(await listProductSpecifications(product.id)).toEqual([{ label: "طرح", value: "راه‌راه" }]);

    await replaceProductSpecifications(product.id, []);
    expect(await listProductSpecifications(product.id)).toEqual([]);
  });

  it("is exposed on the storefront product detail read", async () => {
    const product = await fixture();
    await replaceProductSpecifications(product.id, [{ label: "وزن", value: "۳۰۰ گرم" }]);
    const detail = await getProductDetailBySlug(product.slug);
    expect(detail?.specifications).toEqual([{ label: "وزن", value: "۳۰۰ گرم" }]);
  });

  it("leaves the previous set intact when a replace fails (transactional)", async () => {
    const product = await fixture();
    await replaceProductSpecifications(product.id, [{ label: "الف", value: "۱" }]);

    // Duplicate label violates the DB unique constraint on the insert step.
    await expect(
      replaceProductSpecifications(product.id, [
        { label: "ب", value: "۲" },
        { label: "ب", value: "۳" },
      ]),
    ).rejects.toThrow();
    expect(await listProductSpecifications(product.id)).toEqual([{ label: "الف", value: "۱" }]);
  });

  it("enforces label/value length in the database itself", async () => {
    const product = await fixture();
    await expect(
      db.insert(productSpecifications).values({ productId: product.id, label: "   ", value: "x" }),
    ).rejects.toThrow();
  });

  it("is removed with its product (cascade)", async () => {
    const product = await fixture();
    await replaceProductSpecifications(product.id, [{ label: "الف", value: "۱" }]);
    await db.delete(products).where(eq(products.id, product.id));
    const rows = await db.select().from(productSpecifications).where(eq(productSpecifications.productId, product.id));
    expect(rows).toEqual([]);
  });
});
