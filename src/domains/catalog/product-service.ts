import { and, eq, ne } from "drizzle-orm";
import { db, type DbTransaction } from "@/lib/db/client";
import { productSlugRedirects, productVariants, products } from "@/lib/db/schema";
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

/** Used when a title has no usable letters at all («محصول», then -2, -3…). */
const FALLBACK_SLUG = "محصول";

/**
 * A free slug for a product: the Persian title itself (see `slug.ts`),
 * with `-2`, `-3`… on collision. A slug is "taken" if a live product OR a
 * redirect row uses it — otherwise a new product could silently steal an
 * old URL that is still redirecting somewhere else.
 *
 * `exceptProductId` lets a product keep its own slug when its slug is being
 * regenerated.
 */
export async function generateProductSlug(
  title: string,
  executor: Executor = db,
  exceptProductId?: string,
): Promise<string> {
  const base = slugifyTitle(title) || FALLBACK_SLUG;
  const isTaken = async (candidate: string) => {
    const [live] = await executor
      .select({ id: products.id })
      .from(products)
      .where(exceptProductId ? and(eq(products.slug, candidate), ne(products.id, exceptProductId)) : eq(products.slug, candidate))
      .limit(1);
    if (live) return true;
    const [redirect] = await executor
      .select({ id: productSlugRedirects.id })
      .from(productSlugRedirects)
      .where(
        exceptProductId
          ? and(eq(productSlugRedirects.oldSlug, candidate), ne(productSlugRedirects.productId, exceptProductId))
          : eq(productSlugRedirects.oldSlug, candidate),
      )
      .limit(1);
    return Boolean(redirect);
  };
  return pickAvailableSlug(base, isTaken);
}

/**
 * Remembers `oldSlug` as a permanent redirect to `productId`. Idempotent;
 * if the old slug was already a redirect it is re-pointed at this product.
 * Also drops any redirect row for the product's *new* slug, so a product
 * that returns to a former slug does not leave a pointless self-row.
 */
export async function recordSlugRedirect(
  executor: Executor,
  productId: string,
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  if (oldSlug === newSlug) return;
  await executor
    .insert(productSlugRedirects)
    .values({ oldSlug, productId })
    .onConflictDoUpdate({ target: productSlugRedirects.oldSlug, set: { productId } });
  await executor.delete(productSlugRedirects).where(eq(productSlugRedirects.oldSlug, newSlug));
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
  if (existing) return true;
  // Also reserved: another product's former slug (it still redirects there).
  const [redirect] = await executor
    .select({ id: productSlugRedirects.id })
    .from(productSlugRedirects)
    .where(and(eq(productSlugRedirects.oldSlug, slug), ne(productSlugRedirects.productId, productId)))
    .limit(1);
  return Boolean(redirect);
}
