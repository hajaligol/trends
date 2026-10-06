CREATE SEQUENCE "public"."product_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100001 CACHE 1;--> statement-breakpoint
-- Added nullable first so existing products can be numbered oldest-first
-- (a plain ADD COLUMN ... DEFAULT nextval() would number them in arbitrary
-- physical order). NOT NULL + the default are applied once every row has a code.
ALTER TABLE "products" ADD COLUMN "product_code" integer;--> statement-breakpoint
UPDATE "products" AS p
SET "product_code" = numbered.code
FROM (
  SELECT "id", nextval('product_code_seq')::integer AS code
  FROM (SELECT "id" FROM "products" ORDER BY "created_at" ASC, "id" ASC) AS ordered
) AS numbered
WHERE p."id" = numbered."id";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "product_code" SET DEFAULT nextval('product_code_seq');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "product_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "products_product_code_idx" ON "products" USING btree ("product_code");
