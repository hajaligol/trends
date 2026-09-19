CREATE TABLE "home_category_tiles" (
	"tile_key" text PRIMARY KEY NOT NULL,
	"image_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
