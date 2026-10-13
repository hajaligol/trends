/**
 * One-off, idempotent conversion of EXISTING products to Persian slugs
 * derived from their titles:
 *
 *   npm run db:persian-slugs -- --dry-run   # print the plan, change nothing
 *   npm run db:persian-slugs                # apply it
 *
 * For every product whose slug differs from the one its title now produces,
 * the slug is updated and the OLD slug is stored in `product_slug_redirects`
 * so previously shared/indexed `/product/<old-slug>` URLs keep working
 * (permanent redirect). Each product is handled in its own transaction;
 * running the script again is a no-op once everything is converted.
 *
 * A fresh database does not need this: `npm run db:seed` and the admin
 * create form already generate Persian slugs.
 */
import { asc, eq } from "drizzle-orm";
import { db } from "./client";
import { products } from "./schema";
import { generateProductSlug, recordSlugRedirect } from "@/domains/catalog/product-service";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rows = await db
    .select({ id: products.id, title: products.title, slug: products.slug })
    .from(products)
    .orderBy(asc(products.createdAt), asc(products.id));

  let changed = 0;
  let unchanged = 0;

  for (const row of rows) {
    const next = await db.transaction(async (tx) => {
      const candidate = await generateProductSlug(row.title, tx, row.id);
      if (candidate === row.slug) return null;
      if (!dryRun) {
        await tx.update(products).set({ slug: candidate, updatedAt: new Date() }).where(eq(products.id, row.id));
        await recordSlugRedirect(tx, row.id, row.slug, candidate);
      }
      return candidate;
    });

    if (next === null) {
      unchanged += 1;
    } else {
      changed += 1;
      console.log(`  ${row.slug}  →  ${next}`);
    }
  }

  console.log(`\n${dryRun ? "[dry run] would change" : "Changed"} ${changed} product(s); ${unchanged} already up to date.`);
  if (!dryRun && changed > 0) {
    console.log("Old URLs now redirect permanently. Restart/redeploy so cached product pages are rebuilt.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
