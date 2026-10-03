import Image from "next/image";
import Link from "next/link";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/home/SectionHead";
import { SwipeRow } from "@/components/home/SwipeRow";
import { ShowAllTile } from "@/components/home/ShowAllTile";
import { StarIcon } from "@/components/ui/icons";
import { COLLECTIONS, HOME_ROW_MAX_PRODUCTS } from "@/domains/catalog/presentation";
import { StockBadge } from "@/components/catalog/StockBadge";
import { WishlistButton } from "@/components/ui/WishlistButton";
import type { CatalogProductSummary } from "@/domains/catalog/queries";
import { formatToman } from "@/lib/utils/money";

/**
 * Swipeable row (6 cards visible on desktop, 3 from ~640px, ~2 below
 * that; the prototype's #new-arrivals grid layout). Real catalog data
 * since Phase 4 — see `getNewArrivals` in `@/domains/catalog/queries`.
 * More than `HOME_ROW_MAX_PRODUCTS` products → "show all" tile at
 * the end; arrows always shown.
 */
export function NewArrivals({ arrivals }: { arrivals: CatalogProductSummary[] }) {
  if (arrivals.length === 0) return null;
  const hasMore = arrivals.length > HOME_ROW_MAX_PRODUCTS;
  const visible = arrivals.slice(0, HOME_ROW_MAX_PRODUCTS);

  return (
    <section id="new-arrivals" className="py-[clamp(30px,5vw,54px)]">
      <Container>
        <SectionHead
          eyebrow="تازه‌ترین‌ها"
          title="جدیدترین محصولات"
          icon={<StarIcon className="h-[1.1em] w-[1.1em] text-brand" />}
        />
        <SwipeRow
          label={COLLECTIONS["new-arrivals"].title}
          showArrows
          gapClassName="gap-4"
          itemClassName="basis-[calc((100%_-_16px)/2)] sm:basis-[calc((100%_-_32px)/3)] lg:basis-[calc((100%_-_80px)/6)]"
        >
          {visible.map((arrival) => {
            const primaryImage = arrival.images[0];
            return (
              <article key={arrival.id} className="flex w-full flex-col gap-2">
                <div className="group relative aspect-[4/5] overflow-hidden rounded-[14px] bg-card-image">
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
          {hasMore && (
            <ShowAllTile key="show-all" href="/collection/new-arrivals" label="مشاهده همه" productsLabel={COLLECTIONS["new-arrivals"].title} />
          )}
        </SwipeRow>
      </Container>
    </section>
  );
}
