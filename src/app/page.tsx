import type { Metadata } from "next";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { TopSellingProducts } from "@/components/home/TopSellingProducts";
import { PromoBanners } from "@/components/home/PromoBanners";
import { NewArrivals } from "@/components/home/NewArrivals";
import { BenefitsStrip } from "@/components/home/BenefitsStrip";
import { Container } from "@/components/ui/Container";
import { demoBenefits } from "@/domains/catalog/demo-data";
import { HOME_ROW_MAX_PRODUCTS } from "@/domains/catalog/presentation";
import { getFeaturedProducts, getNewArrivals, getTopSellingProducts } from "@/domains/catalog/queries";
import { getActiveHeroSlides, getActivePromoBanners, getHomeCategoryTiles } from "@/domains/content/queries";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

/**
 * Real homepage sections (Phase 2), backed by real catalog data for
 * categories/featured products/new arrivals (Phase 4) via
 * `@/domains/catalog/queries`, and — as of Phase 11 — real,
 * admin-editable hero slides/promo banners via `@/domains/content/queries`
 * (`hero_slides`/`promo_banners`, managed at `/admin/content`). The
 * benefits strip stays on `demo-data.ts`'s static fixture: it's fixed
 * marketing copy ("۲۴/۷ support", "۳۰-day returns"), not the kind of
 * frequently-changing promotional content §7 calls out — no admin task
 * asks for it to be editable, so adding a table for it now would be
 * scope creep for content nobody has asked to change.
 */
export default async function HomePage() {
  const [categoryTiles, featuredProducts, topSellingProducts, newArrivals, heroSlides, promoBanners] = await Promise.all([
    getHomeCategoryTiles(),
    // One more than a row shows, so each row can tell whether the section
    // has more products than fit and render its "show all" tile.
    getFeaturedProducts(HOME_ROW_MAX_PRODUCTS + 1),
    getTopSellingProducts(HOME_ROW_MAX_PRODUCTS + 1),
    getNewArrivals(HOME_ROW_MAX_PRODUCTS + 1),
    getActiveHeroSlides(),
    getActivePromoBanners(),
  ]);

  return (
    <main>
      {heroSlides.length > 0 && (
        <section id="hero" className="overflow-hidden bg-hero-beige py-[clamp(20px,3vw,32px)]">
          <Container>
            <HeroCarousel slides={heroSlides} />
          </Container>
        </section>
      )}

      <CategoryTiles tiles={categoryTiles} />
      <FeaturedProducts products={featuredProducts} />
      <TopSellingProducts products={topSellingProducts} />
      {promoBanners.length > 0 && <PromoBanners banners={promoBanners} />}
      <NewArrivals arrivals={newArrivals} />
      <BenefitsStrip benefits={demoBenefits} />
    </main>
  );
}
