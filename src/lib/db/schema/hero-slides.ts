import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Homepage hero carousel content, per TRENDS_PROJECT_CONTEXT.md §7
 * ("hero slides") and §12 (`hero_slides/promotional_content`). Replaces
 * `src/domains/catalog/demo-data.ts`'s hardcoded `demoHeroSlides` per
 * CLAUDE_BUILD_INSTRUCTIONS.txt §14 ("hardcoded ... -> database").
 *
 * There is still no object-storage/CDN media pipeline (§3
 * "Infrastructure" — not yet built), so this table does not add an image
 * upload/URL column and the homepage keeps rendering each slide through
 * `AssetSlot` (a placeholder) exactly as it did with the demo data —
 * only `alt`/`ctaHref`/ordering/active-state become admin-editable this
 * phase. When a real media pipeline exists, adding an `imageUrl` column
 * here is a small, additive migration, not a redesign.
 */
export const heroSlides = pgTable("hero_slides", {
  id: uuid("id").defaultRandom().primaryKey(),
  alt: text("alt").notNull(),
  ctaHref: text("cta_href"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HeroSlide = typeof heroSlides.$inferSelect;
export type NewHeroSlide = typeof heroSlides.$inferInsert;
