CREATE TABLE "product_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_specifications_product_label_unique" UNIQUE("product_id","label"),
	CONSTRAINT "product_specifications_label_length" CHECK (char_length(btrim("product_specifications"."label")) between 1 and 80),
	CONSTRAINT "product_specifications_value_length" CHECK (char_length(btrim("product_specifications"."value")) between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_specifications_product_order_idx" ON "product_specifications" USING btree ("product_id","display_order");