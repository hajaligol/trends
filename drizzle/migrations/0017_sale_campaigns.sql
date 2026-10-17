CREATE TYPE "public"."campaign_kind" AS ENUM('percent_off', 'amount_off', 'fixed_price', 'buy_x_get_y_free', 'buy_x_get_y_percent', 'bundle_price', 'tiered_discount', 'basket_discount', 'free_shipping');--> statement-breakpoint
CREATE TABLE "campaign_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"brand_id" uuid,
	"category_id" uuid,
	"product_id" uuid,
	"is_exclusion" boolean DEFAULT false NOT NULL,
	CONSTRAINT "campaign_targets_exactly_one_target" CHECK (num_nonnulls("campaign_targets"."brand_id", "campaign_targets"."category_id", "campaign_targets"."product_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" "campaign_kind" NOT NULL,
	"config" jsonb NOT NULL,
	"applies_to_all" boolean DEFAULT false NOT NULL,
	"stackable" boolean DEFAULT false NOT NULL,
	"show_countdown" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_window_valid" CHECK ("campaigns"."starts_at" IS NULL OR "campaigns"."ends_at" IS NULL OR "campaigns"."starts_at" < "campaigns"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "order_campaign_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"campaign_id" uuid,
	"campaign_name" text NOT NULL,
	"kind" text NOT NULL,
	"discount_toman" integer DEFAULT 0 NOT NULL,
	"shipping_discount_toman" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_campaign_applications_non_negative" CHECK ("order_campaign_applications"."discount_toman" >= 0 AND "order_campaign_applications"."shipping_discount_toman" >= 0)
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "campaign_discount_toman" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "campaign_label" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "campaign_discount_toman" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_discount_toman" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_campaign_applications" ADD CONSTRAINT "order_campaign_applications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_campaign_applications" ADD CONSTRAINT "order_campaign_applications_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_targets_campaign_id_idx" ON "campaign_targets" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_targets_product_id_idx" ON "campaign_targets" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_targets_unique_idx" ON "campaign_targets" USING btree ("campaign_id",coalesce("brand_id", "category_id", "product_id"),"is_exclusion");--> statement-breakpoint
CREATE INDEX "campaigns_is_active_window_idx" ON "campaigns" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "order_campaign_applications_order_id_idx" ON "order_campaign_applications" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_campaign_applications_campaign_id_idx" ON "order_campaign_applications" USING btree ("campaign_id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_campaign_discount_non_negative" CHECK ("order_items"."campaign_discount_toman" >= 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_line_total_matches" CHECK ("order_items"."line_total_toman"::bigint = "order_items"."unit_price_toman"::bigint * "order_items"."quantity" - "order_items"."campaign_discount_toman") NOT VALID;