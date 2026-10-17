import Image from "next/image";
import Link from "next/link";
import { safeHref } from "@/lib/utils/safe-href";
import { Container } from "@/components/ui/Container";

/** Structural type covering the real `promo_banners` DB row and campaign
 * placements. The card only renders the image: `title` is used as the image
 * alt text, everything else (tone, description, CTA label) is ignored. */
type PromoBannerLike = {
  id: string;
  title: string;
  imageUrl: string | null;
  /** Where the card goes. A campaign banner always has one (`/sale/<slug>`). */
  ctaHref?: string | null;
};

/**
 * Two image-only promo banners (stacked on mobile, side-by-side from ~768px).
 * The image fills the whole card; there is no text, button or background
 * colour. A banner without an image is not rendered at all (it would
 * otherwise show an empty/solid block). A banner with a link is fully
 * clickable.
 */
export function PromoBanners({ banners }: { banners: PromoBannerLike[] }) {
  const visible = banners.filter((banner) => banner.imageUrl);
  if (visible.length === 0) return null;

  return (
    <section id="collections" className="pt-[clamp(10px,3vw,20px)] pb-[clamp(30px,5vw,54px)]">
      <Container className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {visible.map((banner) => {
          const href = safeHref(banner.ctaHref);
          const image = (
            <Image
              src={banner.imageUrl!}
              alt={banner.title}
              fill
              sizes="(min-width: 1240px) 610px, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          );
          const cardClasses = "relative block aspect-[16/9] overflow-hidden rounded-[22px] md:aspect-[2.2/1]";
          return href ? (
            <Link key={banner.id} href={href} className={cardClasses}>
              {image}
            </Link>
          ) : (
            <div key={banner.id} className={cardClasses}>
              {image}
            </div>
          );
        })}
      </Container>
    </section>
  );
}
