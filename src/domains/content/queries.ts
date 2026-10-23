import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { heroSlides, homeCategoryTiles, promoBanners } from "@/lib/db/schema";
import type { HeroSlide, PromoBanner } from "@/lib/db/schema";
import { getLiveHomePlacements } from "@/domains/campaigns/placements";
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


export async function getActivePromoBanners(): Promise<PromoBanner[]> {
  return db.select().from(promoBanners).where(eq(promoBanners.isActive, true)).orderBy(asc(promoBanners.displayOrder));
}

export async function listPromoBannersForAdmin(): Promise<PromoBanner[]> {
  return db.select().from(promoBanners).orderBy(asc(promoBanners.displayOrder));
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

/**
 * What the homepage actually shows: live sale campaigns that chose a hero
 * slide / promo banner come FIRST (the sale is the headline), followed by the
 * manually managed `hero_slides` / `promo_banners`. Both link somewhere:
 * campaigns to their `/sale/<slug>` page, manual rows to their `ctaHref`.
 */
export type HomeHeroSlide = {
  id: string;
  alt: string;
  imageUrl: string | null;
  mobileImageUrl?: string | null;
  ctaHref: string | null;
};
export type HomePromoBanner = {
  id: string;
  tone: "pink" | "blue";
  title: string;
  description: string;
  ctaLabel: string;
  imageUrl: string | null;
  ctaHref: string | null;
};

export async function getHomepageHeroSlides(): Promise<HomeHeroSlide[]> {
  const [campaignSlides, manual] = await Promise.all([getLiveHomePlacements(), getActiveHeroSlides()]);
  return [
    ...campaignSlides.hero,
    ...manual.map((slide) => ({ id: slide.id, alt: slide.alt, imageUrl: slide.imageUrl, mobileImageUrl: slide.mobileImageUrl, ctaHref: slide.ctaHref })),
  ];
}

export async function getHomepagePromoBanners(): Promise<HomePromoBanner[]> {
  const [campaignBanners, manual] = await Promise.all([getLiveHomePlacements(), getActivePromoBanners()]);
  return [
    ...campaignBanners.banners,
    ...manual.map((banner) => ({
      id: banner.id,
      tone: banner.tone,
      title: banner.title,
      description: banner.description,
      ctaLabel: banner.ctaLabel,
      imageUrl: banner.imageUrl,
      ctaHref: banner.ctaHref,
    })),
  ];
}
