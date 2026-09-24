import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { productSpecifications } from "@/lib/db/schema";

export type SpecificationRow = { label: string; value: string };

/** Custom spec rows of one product, in the admin's order. */
export async function listProductSpecifications(productId: string): Promise<SpecificationRow[]> {
  return db
    .select({ label: productSpecifications.label, value: productSpecifications.value })
    .from(productSpecifications)
    .where(eq(productSpecifications.productId, productId))
    .orderBy(asc(productSpecifications.displayOrder), asc(productSpecifications.createdAt));
}

/**
 * Replaces a product's whole custom-spec set atomically. Callers must have
 * validated `rows` with `productSpecificationsSchema`; the table's own
 * unique/length constraints remain the backstop. Delete + insert in one
 * transaction so a failure never leaves a half-saved table.
 */
export async function replaceProductSpecifications(productId: string, rows: SpecificationRow[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(productSpecifications).where(eq(productSpecifications.productId, productId));
    if (rows.length === 0) return;
    await tx.insert(productSpecifications).values(
      rows.map((row, index) => ({ productId, label: row.label, value: row.value, displayOrder: index })),
    );
  });
}
