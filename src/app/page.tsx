import type { Metadata } from "next";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryNav } from "@/components/home/CategoryNav";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { PromoBanners } from "@/components/home/PromoBanners";
import { NewArrivals } from "@/components/home/NewArrivals";
import { BenefitsStrip } from "@/components/home/BenefitsStrip";
import { Container } from "@/components/ui/Container";
import { demoBanners, demoBenefits, demoHeroSlides } from "@/domains/catalog/demo-data";
import { getActiveCategories, getFeaturedProducts, getNewArrivals } from "@/domains/catalog/queries";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

/**
 * Real homepage sections (Phase 2), now backed by real catalog data for
 * categories/featured products/new arrivals (Phase 4) via
 * `@/domains/catalog/queries`. Hero slides, promo banners, and the
 * benefits strip stay on `demo-data.ts` fixtures for now — those are
 * homepage promotional content (Phase 11's "hero slides" / "homepage
 * promotional content" admin scope), not catalog data, so they're out of
 * this phase.
 */
export default async function HomePage() {
  const [categories, featuredProducts, newArrivals] = await Promise.all([
    getActiveCategories(),
    getFeaturedProducts(),
    getNewArrivals(),
  ]);

  return (
    <main>
      <section id="hero" className="overflow-hidden bg-hero-beige py-[clamp(20px,3vw,32px)]">
        <Container>
          <HeroCarousel slides={demoHeroSlides} />
        </Container>
      </section>

      <CategoryNav categories={categories} />
      <FeaturedProducts products={featuredProducts} />
      <PromoBanners banners={demoBanners} />
      <NewArrivals arrivals={newArrivals} />
      <BenefitsStrip benefits={demoBenefits} />
    </main>
  );
}
