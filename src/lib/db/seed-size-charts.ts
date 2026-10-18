/**
 * Adds a demo sizing table to every product that doesn't have one yet,
 * based on the product's category and its variants' sizes (see
 * `seed-size-chart-data.ts`). Non-destructive: products that already have a
 * table (e.g. entered by the admin) are left alone unless `--force` is given.
 *
 *   npm run db:seed-size-charts            # fill in missing tables
 *   npm run db:seed-size-charts -- --force # overwrite every product's table
 *
 * A fresh `db:seed` / `db:seed-catalog` already creates these tables, so this
 * script is for databases seeded before the sizing-table feature existed.
 */
import { eq } from "drizzle-orm";
import { db } from "./client";
import { categories, productSizeCharts, productVariants, products } from "./schema";
import { buildSeedSizeChart, parseTypeSlug } from "./seed-size-chart-data";

async function main() {
  const force = process.argv.includes("--force");

  const productRows = await db
    .select({ id: products.id, title: products.title, categorySlug: categories.slug })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId));
  const variantRows = await db
    .select({ productId: productVariants.productId, size: productVariants.size, createdAt: productVariants.createdAt })
    .from(productVariants);
  const existing = new Set((await db.select({ id: productSizeCharts.productId }).from(productSizeCharts)).map((row) => row.id));

  // Distinct sizes per product, in the order the variants were created.
  const sizesByProduct = new Map<string, string[]>();
  for (const variant of [...variantRows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const list = sizesByProduct.get(variant.productId) ?? [];
    if (!list.includes(variant.size)) list.push(variant.size);
    sizesByProduct.set(variant.productId, list);
  }

  let written = 0;
  let skippedExisting = 0;
  const skippedOther: string[] = [];

  for (const product of productRows) {
    if (existing.has(product.id) && !force) {
      skippedExisting += 1;
      continue;
    }
    const parsed = parseTypeSlug(product.categorySlug);
    if (!parsed) {
      skippedOther.push(`${product.title} (${product.categorySlug})`);
      continue;
    }
    const chart = buildSeedSizeChart({ ...parsed, sizes: sizesByProduct.get(product.id) ?? [] });
    await db
      .insert(productSizeCharts)
      .values({ productId: product.id, ...chart })
      .onConflictDoUpdate({ target: productSizeCharts.productId, set: { ...chart, updatedAt: new Date() } });
    written += 1;
  }

  console.log(`Size charts written: ${written}; kept existing: ${skippedExisting}; skipped (custom category): ${skippedOther.length}.`);
  for (const line of skippedOther) console.log(`  - ${line}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Size-chart seed failed:", error);
  process.exit(1);
});
