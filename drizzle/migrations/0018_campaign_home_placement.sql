CREATE TYPE "public"."campaign_home_placement" AS ENUM('none', 'hero', 'banner');--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "slug" text;--> statement-breakpoint
-- Existing campaigns get a stable, unique slug derived from their id.
UPDATE "campaigns" SET "slug" = 'campaign-' || substr("id"::text, 1, 8) WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "home_placement" "campaign_home_placement" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "home_image_url" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "home_banner_tone" "promo_banner_tone" DEFAULT 'pink' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "home_title" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "home_description" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "home_cta_label" text;--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_slug_unique_idx" ON "campaigns" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "campaigns_home_placement_idx" ON "campaigns" USING btree ("home_placement");--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_home_image_required" CHECK ("campaigns"."home_placement" = 'none' OR "campaigns"."home_image_url" IS NOT NULL);