import { relations, sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";

/**
 * Admin-entered sizing table («راهنمای سایز») of one product — at most one
 * per product (the primary key IS the product id). Free-form grid: the
 * admin chooses the column headings (e.g. سایز / دور سینه / قد) and fills
 * every cell, so the same table shape serves tops, trousers, shoes, hats…
 *
 * `columns` is a JSON array of heading strings; `rows` a JSON array of
 * rows, each an array of cell strings with exactly `columns.length`
 * entries. Cells are text on purpose («۹۶–۱۰۰», «۴۲»). The shape and size
 * limits are enforced by the server-side zod schema (`sizeChartSchema`);
 * the CHECKs below are the database backstop for the shape.
 *
 * Purely descriptive — nothing here affects price, stock or checkout.
 * Saved as a whole (upsert) and deleted when the admin clears the table.
 */
export const productSizeCharts = pgTable(
  "product_size_charts",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    columns: jsonb("columns").$type<string[]>().notNull(),
    rows: jsonb("rows").$type<string[][]>().notNull(),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("product_size_charts_columns_array", sql`jsonb_typeof(${table.columns}) = 'array' and jsonb_array_length(${table.columns}) between 1 and 8`),
    check("product_size_charts_rows_array", sql`jsonb_typeof(${table.rows}) = 'array' and jsonb_array_length(${table.rows}) between 1 and 24`),
    check("product_size_charts_note_length", sql`${table.note} is null or char_length(${table.note}) <= 400`),
  ],
);

export const productSizeChartsRelations = relations(productSizeCharts, ({ one }) => ({
  product: one(products, {
    fields: [productSizeCharts.productId],
    references: [products.id],
  }),
}));

export type ProductSizeChartRow = typeof productSizeCharts.$inferSelect;
