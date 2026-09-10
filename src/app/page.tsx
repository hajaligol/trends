import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryNav } from "@/components/home/CategoryNav";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { PromoBanners } from "@/components/home/PromoBanners";
import { NewArrivals } from "@/components/home/NewArrivals";
import { BenefitsStrip } from "@/components/home/BenefitsStrip";
import { Container } from "@/components/ui/Container";
import {
  demoBanners,
  demoBenefits,
  demoCategories,
  demoFeaturedProducts,
  demoHeroSlides,
  demoNewArrivals,
} from "@/domains/catalog/demo-data";

/**
 * Real homepage sections rebuilt as components (Phase 2), replacing the
 * Phase 1 placeholder. All content below comes from
 * src/domains/catalog/demo-data.ts -- Phase 3 swaps these fixtures for
 * real catalog queries; component props are already shaped like the
 * eventual database read models, so that swap should need minimal
 * changes to the components themselves.
 */
export default function HomePage() {
  return (
    <main>
      <section id="hero" className="overflow-hidden bg-hero-beige py-[clamp(20px,3vw,32px)]">
        <Container>
          <HeroCarousel slides={demoHeroSlides} />
        </Container>
      </section>

      <CategoryNav categories={demoCategories} />
      <FeaturedProducts products={demoFeaturedProducts} />
      <PromoBanners banners={demoBanners} />
      <NewArrivals arrivals={demoNewArrivals} />
      <BenefitsStrip benefits={demoBenefits} />
    </main>
  );
}
