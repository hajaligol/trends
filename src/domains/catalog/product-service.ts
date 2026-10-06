import { and, eq, ne } from "drizzle-orm";
import { db, type DbTransaction } from "@/lib/db/client";
import { productVariants, products } from "@/lib/db/schema";
import type { BulkVariantsInput } from "@/lib/validation/admin";
import { getPaletteColor } from "@/domains/catalog/color-palette";
import { pickAvailableSlug, slugifyTitle } from "@/domains/catalog/slug";
import { buildVariantSku } from "@/domains/catalog/sku";

/**
 * Catalog write rules that must hold no matter which admin screen calls
 * them: how a slug is derived, how variants (and their SKUs) are created.
 * The Server Actions in `admin-actions.ts` stay thin wrappers around this.
 */

type Executor = typeof db | DbTransaction;

/** A free slug for a new product: generated from the title, with `-2`,
 * `-3`… on collision, or `product-<code>` if the title has no usable
 * letters at all (then the product code makes it unique). */
export async function generateProductSlug(title: string, executor: Executor = db): Promise<string> {
  const base = slugifyTitle(title);
  const isTaken = async (candidate: string) => {
    const [existing] = await executor.select({ id: products.id }).from(products).where(eq(products.slug, candidate)).limit(1);
    return Boolean(existing);
  };
  if (!base) return pickAvailableSlug("product", isTaken);
  return pickAvailableSlug(base, isTaken);
}

export type BulkVariantResult = { created: number; skipped: number };

/**
 * Creates every size × colour row for a product in one go.
 *
 *  - Colours are resolved from the server-side palette by `code`; the
 *    browser never supplies a name or hex that gets stored.
 *  - SKUs are built here from the product's code.
 *  - A combination that already exists (same size + colour on this
 *    product) is skipped, not an error: re-running the form to add one
 *    more size must not fail because the others are already there. The
 *    unique indexes remain the real enforcers (`ON CONFLICT DO NOTHING`).
 */
export async function insertVariantsBulk(
  executor: Executor,
  product: { id: string; productCode: number },
  input: BulkVariantsInput,
): Promise<BulkVariantResult> {
  const seen = new Set<string>();
  const values: Array<typeof productVariants.$inferInsert> = [];

  for (const row of input.rows) {
    const color = getPaletteColor(row.colorCode);
    if (!color) throw new VariantInputError("رنگ انتخاب‌شده معتبر نیست");
    const key = `${row.size}\u0000${color.code}`;
    if (seen.has(key)) continue; // same pair twice in one payload
    seen.add(key);

    values.push({
      productId: product.id,
      sku: buildVariantSku(product.productCode, row.size, { name: color.name, hex: color.hex }),
      size: row.size,
      color: color.name,
      colorHex: color.hex,
      material: input.material,
      priceToman: row.priceToman,
      compareAtPriceToman: row.compareAtPriceToman,
      stock: row.stock,
      lowStockThreshold: input.lowStockThreshold,
      isActive: input.isActive,
    });
  }

  if (values.length === 0) return { created: 0, skipped: 0 };

  const inserted = await executor
    .insert(productVariants)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: productVariants.id });

  return { created: inserted.length, skipped: values.length - inserted.length };
}

/** Thrown for input the Zod schema can't judge on its own (unknown palette
 * code); actions turn it into a Persian message. */
export class VariantInputError extends Error {}

export async function loadProductCode(productId: string, executor: Executor = db) {
  const [row] = await executor
    .select({ id: products.id, productCode: products.productCode, slug: products.slug })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  return row ?? null;
}

export async function isSlugTakenByOther(slug: string, productId: string, executor: Executor = db): Promise<boolean> {
  const [existing] = await executor
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.slug, slug), ne(products.id, productId)))
    .limit(1);
  return Boolean(existing);
}
