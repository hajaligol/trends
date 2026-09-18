import Image from "next/image";
import Link from "next/link";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/home/SectionHead";
import { StockBadge } from "@/components/catalog/StockBadge";
import { WishlistButton } from "@/components/ui/WishlistButton";
import type { CatalogProductSummary } from "@/domains/catalog/queries";
import { formatToman } from "@/lib/utils/money";

/**
 * Mirrors #new-arrivals .arrivals-grid in the prototype: 6 columns
 * desktop, 3 from ~640px, 2 below that. Real catalog data since Phase 4 —
 * see `getNewArrivals` in `@/domains/catalog/queries`.
 */
export function NewArrivals({ arrivals }: { arrivals: CatalogProductSummary[] }) {
  return (
    <section id="new-arrivals" className="py-[clamp(30px,5vw,54px)]">
      <Container>
        <SectionHead eyebrow="تازه‌ترین‌ها" title="جدیدترین محصولات" viewAllHref="#new-arrivals" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {arrivals.map((arrival) => {
            const primaryImage = arrival.images[0];
            return (
              <article key={arrival.id} className="flex flex-col gap-2">
                <div className="group relative aspect-square overflow-hidden rounded-[14px] bg-card-image">
                  <Link href={`/product/${arrival.slug}`} className="absolute inset-0 block">
                    {primaryImage ? (
                      <Image
                        src={primaryImage.url}
                        alt={primaryImage.altText}
                        fill
                        sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    ) : (
                      <AssetSlot label={arrival.title} rounded="none" className="h-full w-full" />
                    )}
                  </Link>
                  {/* Sibling of the image link, not nested inside it — a <button>
                   * inside an <a> is invalid HTML and breaks keyboard/AT navigation. */}
                  <WishlistButton productId={arrival.id} productName={arrival.title} />
                </div>
                <Link href={`/product/${arrival.slug}`} className="text-[0.87rem] font-semibold">
                  {arrival.title}
                </Link>
                <p className="text-[0.83rem] text-text-secondary">
                  {arrival.fromPriceToman !== null ? formatToman(arrival.fromPriceToman) : "—"}
                </p>
                {arrival.colorHexes.length > 0 && (
                  <div className="mt-1 flex gap-1.5">
                    {arrival.colorHexes.map((hex, index) => (
                      <span
                        key={`${arrival.id}-swatch-${index}`}
                        aria-hidden="true"
                        style={{ backgroundColor: hex }}
                        className="h-3 w-3 rounded-full border border-ink/15"
                      />
                    ))}
                  </div>
                )}
                <StockBadge state={arrival.stockState} />
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
