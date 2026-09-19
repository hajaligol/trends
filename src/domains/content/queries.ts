import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { heroSlides, homeCategoryTiles, promoBanners } from "@/lib/db/schema";
import type { HeroSlide, PromoBanner } from "@/lib/db/schema";
import { HOME_CATEGORY_TILES, type HomeCategoryTile } from "@/domains/content/home-category-tiles";

/**
 * Homepage promotional content reads. `getActiveHeroSlides`/
 * `getActivePromoBanners` are what `src/app/page.tsx` calls (storefront,
 * active-only, ordered) — `listHeroSlidesForAdmin`/
 * `listPromoBannersForAdmin` are the admin-facing equivalents that also
 * return inactive rows so an operator can re-enable them.
 */

export async function getActiveHeroSlides(): Promise<HeroSlide[]> {
  return db.select().from(heroSlides).where(eq(heroSlides.isActive, true)).orderBy(asc(heroSlides.displayOrder));
}

export async function listHeroSlidesForAdmin(): Promise<HeroSlide[]> {
  return db.select().from(heroSlides).orderBy(asc(heroSlides.displayOrder));
}

export async function getHeroSlideForAdmin(id: string): Promise<HeroSlide | null> {
  const [row] = await db.select().from(heroSlides).where(eq(heroSlides.id, id)).limit(1);
  return row ?? null;
}

export async function getActivePromoBanners(): Promise<PromoBanner[]> {
  return db.select().from(promoBanners).where(eq(promoBanners.isActive, true)).orderBy(asc(promoBanners.displayOrder));
}

export async function listPromoBannersForAdmin(): Promise<PromoBanner[]> {
  return db.select().from(promoBanners).orderBy(asc(promoBanners.displayOrder));
}

export async function getPromoBannerForAdmin(id: string): Promise<PromoBanner | null> {
  const [row] = await db.select().from(promoBanners).where(eq(promoBanners.id, id)).limit(1);
  return row ?? null;
}

/**
 * The six homepage category squares, in display order, with the admin's
 * chosen picture (or `null` -> placeholder) for each. Used by both the
 * storefront and the admin editor — there is nothing to hide, every tile
 * is always shown.
 */
export async function getHomeCategoryTiles(): Promise<HomeCategoryTile[]> {
  const rows = await db.select().from(homeCategoryTiles);
  const imageByKey = new Map(rows.map((row) => [row.tileKey, row.imageUrl]));
  return HOME_CATEGORY_TILES.map((tile) => ({ ...tile, imageUrl: imageByKey.get(tile.key) ?? null }));
}
