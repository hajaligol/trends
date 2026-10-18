import { eq } from "drizzle-orm";
import { db, type DbTransaction } from "@/lib/db/client";
import { productSizeCharts } from "@/lib/db/schema";

export type SizeChart = { columns: string[]; rows: string[][]; note: string | null };

/** Inserts a new product's sizing table (no upsert); `chart` must be schema-validated. */
export async function insertProductSizeChart(executor: typeof db | DbTransaction, productId: string, chart: SizeChart): Promise<void> {
  await executor.insert(productSizeCharts).values({ productId, columns: chart.columns, rows: chart.rows, note: chart.note });
}

/** A product's sizing table, or null when the admin hasn't entered one. */
export async function getProductSizeChart(productId: string): Promise<SizeChart | null> {
  const [row] = await db
    .select({ columns: productSizeCharts.columns, rows: productSizeCharts.rows, note: productSizeCharts.note })
    .from(productSizeCharts)
    .where(eq(productSizeCharts.productId, productId))
    .limit(1);
  return row ?? null;
}

/** Saves (upserts) the table; `null` removes it. Callers must have validated
 * the chart with `sizeChartSchema`. */
export async function replaceProductSizeChart(productId: string, chart: SizeChart | null): Promise<void> {
  if (!chart) {
    await db.delete(productSizeCharts).where(eq(productSizeCharts.productId, productId));
    return;
  }
  await db
    .insert(productSizeCharts)
    .values({ productId, columns: chart.columns, rows: chart.rows, note: chart.note })
    .onConflictDoUpdate({
      target: productSizeCharts.productId,
      set: { columns: chart.columns, rows: chart.rows, note: chart.note, updatedAt: new Date() },
    });
}
