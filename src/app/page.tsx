import type { Metadata } from "next";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryNav } from "@/components/home/CategoryNav";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { PromoBanners } from "@/components/home/PromoBanners";
import { NewArrivals } from "@/components/home/NewArrivals";
import { BenefitsStrip } from "@/components/home/BenefitsStrip";
import { Container } from "@/components/ui/Container";
import { demoBenefits } from "@/domains/catalog/demo-data";
import { getActiveCategories, getFeaturedProducts, getNewArrivals } from "@/domains/catalog/queries";
import { getActiveHeroSlides, getActivePromoBanners } from "@/domains/content/queries";

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
  const [categories, featuredProducts, newArrivals, heroSlides, promoBanners] = await Promise.all([
    getActiveCategories(),
    getFeaturedProducts(),
    getNewArrivals(),
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

      <CategoryNav categories={categories} />
      <FeaturedProducts products={featuredProducts} />
      {promoBanners.length > 0 && <PromoBanners banners={promoBanners} />}
      <NewArrivals arrivals={newArrivals} />
      <BenefitsStrip benefits={demoBenefits} />
    </main>
  );
}
