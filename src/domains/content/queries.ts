import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { heroSlides, promoBanners } from "@/lib/db/schema";
import type { HeroSlide, PromoBanner } from "@/lib/db/schema";

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
