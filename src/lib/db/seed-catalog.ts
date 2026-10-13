/**
 * Replaces the catalog: deletes ALL products and ALL brands, then seeds a new
 * demo set (see `seed-catalog-data.ts`) on top of the categories already in
 * the database. Categories, orders, users, coupons and homepage content are
 * not touched.
 *
 * Deleting a product cascades to its variants, images, specifications,
 * reviews, wishlist entries, cart lines and slug redirects. Past orders keep
 * their own item snapshots (their product link just becomes empty).
 *
 * Destructive, so it refuses to run without `--yes`:
 *   npm run db:seed-catalog            # shows what would be deleted
 *   npm run db:seed-catalog -- --yes   # does it
 */
import { count, sql } from "drizzle-orm";
import { db } from "./client";
import { brands, products } from "./schema";
import { seedCatalog } from "./seed-catalog-data";

function describeDatabase(): string {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const confirmed = process.argv.includes("--yes");
  const [[productCount], [brandCount]] = await Promise.all([
    db.select({ total: count() }).from(products),
    db.select({ total: count() }).from(brands),
  ]);

  console.log(`Database: ${describeDatabase()}`);
  console.log(`Will DELETE ${productCount?.total ?? 0} products and ${brandCount?.total ?? 0} brands, then seed a new catalog.`);

  if (!confirmed) {
    console.log("Nothing changed. Re-run with `-- --yes` to proceed:  npm run db:seed-catalog -- --yes");
    process.exit(0);
  }

  const result = await db.transaction(async (tx) => {
    await tx.delete(products);
    await tx.delete(brands);
    // Fresh catalog → product codes start again at 100001.
    await tx.execute(sql`ALTER SEQUENCE product_code_seq RESTART WITH 100001`);
    return seedCatalog(tx);
  });

  console.log(
    `Seeded ${result.brands} brands and ${result.products} products (${result.variants} variants) covering ${result.leaves} categories.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("Catalog seed failed (nothing was changed):", error);
  process.exit(1);
});
