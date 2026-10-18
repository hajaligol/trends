CREATE TABLE "product_size_charts" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"columns" jsonb NOT NULL,
	"rows" jsonb NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_size_charts_columns_array" CHECK (jsonb_typeof("product_size_charts"."columns") = 'array' and jsonb_array_length("product_size_charts"."columns") between 1 and 8),
	CONSTRAINT "product_size_charts_rows_array" CHECK (jsonb_typeof("product_size_charts"."rows") = 'array' and jsonb_array_length("product_size_charts"."rows") between 1 and 24),
	CONSTRAINT "product_size_charts_note_length" CHECK ("product_size_charts"."note" is null or char_length("product_size_charts"."note") <= 400)
);
--> statement-breakpoint
ALTER TABLE "product_size_charts" ADD CONSTRAINT "product_size_charts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;