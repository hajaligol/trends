import Image from "next/image";
import Link from "next/link";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { Button, buttonClasses } from "@/components/ui/Button";
import { safeHref } from "@/lib/utils/safe-href";
import { Container } from "@/components/ui/Container";

/** Structural type covering both the old `DemoBanner` fixture shape and
 * the real `promo_banners` DB row (Phase 11) — this component only ever
 * reads these fields. */
type PromoBannerLike = {
  id: string;
  tone: "pink" | "blue";
  title: string;
  description: string;
  ctaLabel: string;
  imageUrl: string | null;
  /** Where the card goes. A campaign banner always has one (`/sale/<slug>`). */
  ctaHref?: string | null;
};

const ARROW = (
  <span aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  </span>
);

// Mirrors .banner-card--pink / .banner-card--blue in the prototype.
const TONE_BG: Record<PromoBannerLike["tone"], string> = {
  pink: "bg-pink",
  blue: "bg-blue",
};

/**
 * Mirrors #collections .banner-grid in the prototype: two pastel banner
 * cards, stacked on mobile and side-by-side from ~768px. Banners come
 * from `promo_banners` (Phase 11, `/admin/content`) via
 * `src/app/page.tsx`. A banner with a link (every campaign banner, and any
 * manual banner with a `ctaHref`) is fully clickable; without one the CTA
 * stays inert like the prototype's.
 */
export function PromoBanners({ banners }: { banners: PromoBannerLike[] }) {
  return (
    <section id="collections" className="pt-[clamp(10px,3vw,20px)] pb-[clamp(30px,5vw,54px)]">
      <Container className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={`relative flex flex-col overflow-hidden rounded-[22px] text-center md:min-h-[260px] md:flex-row md:items-center md:text-start ${TONE_BG[banner.tone]}`}
          >
            <div className="w-full p-[clamp(20px,3vw,40px)] md:w-auto md:flex-1">
              <h3 className="m-0 mb-2.5 text-[clamp(1.3rem,2.4vw,1.7rem)] font-bold">
                {banner.title}
              </h3>
              <p className="mx-auto mb-[22px] max-w-[260px] text-[0.92rem] leading-[1.7] text-ink/75 md:mx-0">
                {banner.description}
              </p>
              {safeHref(banner.ctaHref) ? (
                // Stretched link: the whole card is clickable, the button is its accessible name.
                <Link
                  href={safeHref(banner.ctaHref)!}
                  className={`${buttonClasses("ghost")} after:absolute after:inset-0 after:content-['']`}
                >
                  <span>{banner.ctaLabel}</span>
                  {ARROW}
                </Link>
              ) : (
                <Button type="button" variant="ghost">
                  <span>{banner.ctaLabel}</span>
                  {ARROW}
                </Button>
              )}
            </div>
            <div className="relative w-full min-h-[200px] md:w-auto md:min-h-[260px] md:flex-1 md:self-stretch">
              {banner.imageUrl ? (
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <AssetSlot
                  label={banner.title}
                  tone="banner"
                  rounded="none"
                  className="h-full w-full"
                />
              )}
            </div>
          </div>
        ))}
      </Container>
    </section>
  );
}
