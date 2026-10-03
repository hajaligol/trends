import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SwipeRow } from "@/components/home/SwipeRow";
import { ShowAllTile } from "@/components/home/ShowAllTile";
import { FlameIcon } from "@/components/ui/icons";
import {
  COLLECTIONS,
  HOME_ROW_MAX_PRODUCTS,
} from "@/domains/catalog/presentation";
import type { CatalogProductSummary } from "@/domains/catalog/queries";

/**
 * A swipeable row (5 cards visible on desktop, 3 from ~640px, ~2 below
 * that). Real catalog data since Phase 4 — see `getFeaturedProducts` in
 * `@/domains/catalog/queries`. The page passes up to
 * `HOME_ROW_MAX_PRODUCTS + 1` products: if there are more than
 * `HOME_ROW_MAX_PRODUCTS`, the row shows the first ones, keeps its arrows
 * and ends with a "show all" tile linking to `/collection/featured`.
 *
 * Styled as the homepage's "hero" product section on purpose: a light-purple
 * panel with a full-width purple head band (white flame icon + title), and
 * each product on its own white tile. The arrows scroll the row with a
 * smooth eased animation (see `SwipeRow`); there is no hover lift or flame
 * pulse. `ProductCard` itself is
 * untouched (it is shared with category listings) — the tile is a wrapper
 * around it here.
 */
export function FeaturedProducts({
  products,
}: {
  products: CatalogProductSummary[];
}) {
  if (products.length === 0) return null;
  const hasMore = products.length > HOME_ROW_MAX_PRODUCTS;
  const visible = products.slice(0, HOME_ROW_MAX_PRODUCTS);

  return (
    <section id="featured" className="py-[clamp(30px,5vw,54px)]">
      <Container>
        <div className="relative overflow-hidden rounded-[clamp(20px,3vw,32px)] border border-brand/15 bg-[#f3ebfa] shadow-[0_30px_70px_-32px_rgba(91,15,165,0.5)]">
          {/* Full-width purple head band: spans the whole top of the panel. */}
          <div className="flex items-center gap-3.5 bg-brand px-[clamp(14px,3vw,40px)] py-3 sm:gap-4 sm:py-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14"
            >
              <FlameIcon
                className="h-9 w-9 text-white sm:h-10 sm:w-10"
                strokeWidth={2}
              />
            </span>
            <h2 className="m-0 text-[clamp(1.7rem,3.4vw,2.5rem)] font-extrabold leading-[1.3] text-white">
              شگفت‌انگیزها
            </h2>
          </div>

          <div className="px-[clamp(14px,3vw,40px)] pb-[clamp(18px,3vw,40px)] pt-[clamp(20px,3vw,34px)]">
            <SwipeRow
              label={COLLECTIONS.featured.title}
              showArrows
              gapClassName="gap-3.5 sm:gap-5"
              itemClassName="basis-[calc((100%_-_14px)/2)] sm:basis-[calc((100%_-_40px)/3)] lg:basis-[calc((100%_-_80px)/5)]"
            >
              {visible.map((product) => (
                <div
                  key={product.id}
                  className="w-full rounded-[24px] bg-white/85 p-2.5 shadow-[0_2px_14px_-6px_rgba(24,38,48,0.18)] ring-1 ring-white"
                >
                  <ProductCard product={product} />
                </div>
              ))}
              {hasMore && (
                <ShowAllTile
                  key="show-all"
                  href="/collection/featured"
                  label="مشاهده همه"
                  productsLabel={COLLECTIONS.featured.title}
                />
              )}
            </SwipeRow>
          </div>
        </div>
      </Container>
    </section>
  );
}
