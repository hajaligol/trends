/**
 * Non-destructive category sync for an EXISTING database:
 *
 *   npm run db:sync-categories
 *   npm run db:sync-categories -- --deactivate-outside   # also hide old categories
 *
 * Creates/updates the three-level category taxonomy defined in
 * `src/domains/categories/taxonomy.ts` (مردانه/زنانه/بچگانه > لباس/کفش/کیف/
 * اکسسوری > types), then prints what it could not sort out on its own:
 * old categories that are not part of the new taxonomy, and products still
 * filed directly under a category that now has sub-categories. Nothing is
 * deleted and no product is moved — re-filing them is a merchandising
 * decision, done in `/admin/products`.
 *
 * Use `npm run db:seed` instead for a throwaway development database: that
 * one wipes the catalog and rebuilds it from scratch.
 */
import { db } from "./client";
import {
  auditCategoryAssignments,
  deactivateCategoriesOutsideTaxonomy,
  syncCategoryTaxonomy,
} from "@/domains/categories/sync";

async function main() {
  console.log("Syncing category taxonomy...");
  const result = await syncCategoryTaxonomy(db);
  console.log(`  ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged.`);

  if (process.argv.includes("--deactivate-outside")) {
    const switchedOff = await deactivateCategoriesOutsideTaxonomy(db);
    console.log(`  Switched off ${switchedOff.length} category(ies) outside the taxonomy (nothing deleted).`);
  }

  const audit = await auditCategoryAssignments(db);

  if (audit.outsideTaxonomy.length > 0) {
    console.log("\nCategories that are not part of the new taxonomy (none were deleted or had products moved):");
    for (const category of audit.outsideTaxonomy) {
      console.log(`  - ${category.slug} «${category.name}» — ${category.productCount} product(s)`);
    }
    console.log("  Move their products to a type category in /admin/products, then delete them — or run");
    console.log("  `npm run db:sync-categories -- --deactivate-outside` to just hide them from the menu.");
  }

  if (audit.productsOnNonLeafCategory.length > 0) {
    console.log("\nProducts filed directly under a category that now has sub-categories:");
    for (const product of audit.productsOnNonLeafCategory) {
      console.log(`  - ${product.slug} «${product.title}» (in ${product.categorySlug})`);
    }
    console.log("  They still appear in that category's listing; re-file them under a type category.");
  }

  if (audit.outsideTaxonomy.length === 0 && audit.productsOnNonLeafCategory.length === 0) {
    console.log("\nNothing else needs attention.");
  }

  console.log("\nDone. If the site is already running in production mode, restart or revalidate it so the menu picks up the new tree.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Category sync failed:", error);
  process.exit(1);
});
