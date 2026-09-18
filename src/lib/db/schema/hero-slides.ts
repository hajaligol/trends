import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Homepage hero carousel content, per TRENDS_PROJECT_CONTEXT.md §7
 * ("hero slides") and §12 (`hero_slides/promotional_content`). Replaces
 * `src/domains/catalog/demo-data.ts`'s hardcoded `demoHeroSlides` per
 * CLAUDE_BUILD_INSTRUCTIONS.txt §14 ("hardcoded ... -> database").
 *
 * `imageUrl` was added by migration `0008` once the local
 * disk-backed admin media upload endpoint
 * (`src/app/api/admin/media/route.ts`) landed — see that route's header
 * comment for why local disk rather than real object storage/CDN is
 * this phase's deliberately simplest correct choice. Nullable because
 * existing rows/newly-created slides may not have picked an image yet;
 * the homepage falls back to `AssetSlot` when it's null, exactly as it
 * did before this column existed.
 */
export const heroSlides = pgTable("hero_slides", {
  id: uuid("id").defaultRandom().primaryKey(),
  alt: text("alt").notNull(),
  imageUrl: text("image_url"),
  ctaHref: text("cta_href"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HeroSlide = typeof heroSlides.$inferSelect;
export type NewHeroSlide = typeof heroSlides.$inferInsert;
