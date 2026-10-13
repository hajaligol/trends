CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"logo_url" text,
	"country_of_origin" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_name_lower_idx" ON "brands" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "brands_is_active_display_order_idx" ON "brands" USING btree ("is_active","display_order");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_brand_id_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
-- Data backfill (hand-written): turn every distinct legacy free-text
-- `products.brand` into a `brands` row (whitespace-collapsed, case-insensitive
-- de-duplication; slug built like product slugs; clashes get -2, -3...), then
-- point each product at its brand. The text column is dropped in 0016.
WITH cleaned AS (
	SELECT DISTINCT ON (lower(btrim(regexp_replace(brand, '\s+', ' ', 'g'))))
		btrim(regexp_replace(brand, '\s+', ' ', 'g')) AS name
	FROM "products"
	WHERE brand IS NOT NULL AND btrim(brand) <> ''
	ORDER BY lower(btrim(regexp_replace(brand, '\s+', ' ', 'g'))), btrim(regexp_replace(brand, '\s+', ' ', 'g'))
), based AS (
	SELECT
		name,
		COALESCE(NULLIF(left(btrim(regexp_replace(translate(lower(name), 'يىكةأإ', 'ییکهاا'), '[^a-z0-9آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئؤء]+', '-', 'g'), '-'), 80), ''), 'brand') AS base
	FROM cleaned
), numbered AS (
	SELECT name, base, row_number() OVER (PARTITION BY base ORDER BY name) AS rn FROM based
)
INSERT INTO "brands" ("name", "slug")
SELECT name, CASE WHEN rn = 1 THEN base ELSE base || '-' || rn END FROM numbered;--> statement-breakpoint
UPDATE "products" p
SET "brand_id" = b."id"
FROM "brands" b
WHERE p."brand" IS NOT NULL
	AND lower(btrim(regexp_replace(p."brand", '\s+', ' ', 'g'))) = lower(b."name");
