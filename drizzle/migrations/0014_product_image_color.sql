ALTER TABLE "product_images" ADD COLUMN "color" text;--> statement-breakpoint
CREATE INDEX "product_images_product_color_idx" ON "product_images" USING btree ("product_id","color");--> statement-breakpoint
-- Backfill: images that were scoped to one variant (size+colour) become
-- scoped to that variant's colour. `variant_id` is left untouched.
UPDATE "product_images" SET "color" = "product_variants"."color" FROM "product_variants" WHERE "product_images"."variant_id" = "product_variants"."id";
