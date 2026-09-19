import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Images for the six homepage category squares. The squares themselves
 * (their keys, labels and links) are fixed in code — see
 * `src/domains/content/home-category-tiles.ts` — because the fifth one
 * ("اکسسوری", men's + women's accessories) has no single category row to
 * hang an image on. This table only stores the admin-chosen picture per
 * tile key; a tile with no row (or a null `image_url`) renders as a
 * placeholder, exactly like the other not-yet-uploaded homepage images.
 */
export const homeCategoryTiles = pgTable("home_category_tiles", {
  tileKey: text("tile_key").primaryKey(),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HomeCategoryTileRow = typeof homeCategoryTiles.$inferSelect;
