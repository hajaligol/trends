import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Homepage promotional banner cards (the "مجموعه زنانه"/"مجموعه مردانه"
 * pastel cards under `#collections`), per TRENDS_PROJECT_CONTEXT.md §7
 * ("homepage promotional content") and §12. Replaces
 * `src/domains/catalog/demo-data.ts`'s hardcoded `demoBanners`.
 *
 * `tone` reuses the same two-value pastel palette
 * (`src/components/home/PromoBanners.tsx`'s `TONE_BG`) the prototype
 * already defines — a real color-picker/token system is out of scope
 * here; picking between the two established tones is all admin content
 * editing needs.
 *
 * `imageUrl` was added by migration `0008` alongside the admin media
 * upload endpoint — see `hero-slides.ts`'s header comment for the same
 * rationale. Nullable; the storefront card falls back to `AssetSlot`
 * (the pastel placeholder block) when null.
 */
export const promoBannerToneEnum = pgEnum("promo_banner_tone", ["pink", "blue"]);

export const promoBanners = pgTable("promo_banners", {
  id: uuid("id").defaultRandom().primaryKey(),
  tone: promoBannerToneEnum("tone").notNull().default("pink"),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  description: text("description").notNull(),
  ctaLabel: text("cta_label").notNull(),
  ctaHref: text("cta_href"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PromoBanner = typeof promoBanners.$inferSelect;
export type NewPromoBanner = typeof promoBanners.$inferInsert;
