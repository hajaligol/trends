import { AssetSlot } from "@/components/ui/AssetSlot";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import type { DemoBanner } from "@/domains/catalog/demo-data";

// Mirrors .banner-card--pink / .banner-card--blue in the prototype.
const TONE_BG: Record<DemoBanner["tone"], string> = {
  pink: "bg-pink",
  blue: "bg-blue",
};

/**
 * Mirrors #collections .banner-grid in the prototype: two pastel banner
 * cards, stacked on mobile and side-by-side from ~768px. CTA buttons are
 * inert (`type="button"`, no href) exactly like the prototype's — real
 * category routes land in Phase 4.
 */
export function PromoBanners({ banners }: { banners: DemoBanner[] }) {
  return (
    <section id="collections" className="pt-[clamp(10px,3vw,20px)] pb-[clamp(30px,5vw,54px)]">
      <Container className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={`flex flex-col overflow-hidden rounded-[22px] text-center md:min-h-[260px] md:flex-row md:items-center md:text-start ${TONE_BG[banner.tone]}`}
          >
            <div className="w-full p-[clamp(20px,3vw,40px)] md:w-auto md:flex-1">
              <h3 className="m-0 mb-2.5 text-[clamp(1.3rem,2.4vw,1.7rem)] font-bold">
                {banner.title}
              </h3>
              <p className="mx-auto mb-[22px] max-w-[260px] text-[0.92rem] leading-[1.7] text-ink/75 md:mx-0">
                {banner.description}
              </p>
              <Button type="button" variant="ghost">
                <span>{banner.ctaLabel}</span>
                <span aria-hidden="true">←</span>
              </Button>
            </div>
            <div className="w-full min-h-[200px] md:w-auto md:min-h-[260px] md:flex-1 md:self-stretch">
              <AssetSlot
                label={banner.title}
                tone="banner"
                rounded="none"
                className="h-full w-full"
              />
            </div>
          </div>
        ))}
      </Container>
    </section>
  );
}
