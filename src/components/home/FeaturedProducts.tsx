import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SwipeRow } from "@/components/home/SwipeRow";
import { BrushStrokes, BrushUnderline } from "@/components/home/BrushStrokes";
import { ShowAllTile } from "@/components/home/ShowAllTile";
import { FireIcon } from "@/components/ui/icons";
import {
  COLLECTIONS,
  HOME_ROW_MAX_PRODUCTS,
} from "@/domains/catalog/presentation";
import type { CatalogProductSummary } from "@/domains/catalog/queries";

/**
 * Homepage "hero" product section (شگفت‌انگیزها) in a premium black/purple
 * look, as ONE rounded card: the header (large fire icon, white title,
 * brush-stroke underline) and the product row share a single black→purple gradient
 * background, each product on a white rounded tile. Black/purple paintbrush strokes (`BrushStrokes`, SVG) sit behind the content. No glow
 * and no animation beyond the row's normal sliding arrows (see `SwipeRow`).
 *
 * More than `HOME_ROW_MAX_PRODUCTS` products → the row keeps its arrows
 * and ends with a "show all" tile linking to `/collection/featured`.
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
        <div className="rounded-[clamp(18px,2.8vw,30px)] border border-white/10 bg-[linear-gradient(to_bottom_left,#0a0610_0%,#170830_50%,#3a0d72_100%)] relative isolate px-[clamp(14px,3vw,40px)] py-[clamp(18px,3vw,36px)]">
          <BrushStrokes />
          <div className="mb-[clamp(16px,2.6vw,28px)] flex items-center gap-[clamp(12px,2vw,20px)]">
            <FireIcon aria-hidden="true" className="h-[clamp(64px,9vw,96px)] w-auto shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-[clamp(1.7rem,3.6vw,2.7rem)] font-extrabold leading-[1.25] text-white">
                شگفت‌انگیزها
              </h2>
              <BrushUnderline />
            </div>
          </div>

          <SwipeRow
            label={COLLECTIONS.featured.title}
            showArrows
            gapClassName="gap-3.5 sm:gap-5"
            itemClassName="basis-[calc((100%_-_14px)/2)] sm:basis-[calc((100%_-_40px)/3)] lg:basis-[calc((100%_-_80px)/5)]"
          >
            {visible.map((product) => (
              <div
                key={product.id}
                className="w-full rounded-[22px] bg-white p-2.5"
              >
                <ProductCard product={product} showOptions={false} />
              </div>
            ))}
            {hasMore && (
              <ShowAllTile
                key="show-all"
                href="/collection/featured"
                label="مشاهده همه"
                tone="dark"
                productsLabel={COLLECTIONS.featured.title}
              />
            )}
          </SwipeRow>
        </div>
      </Container>
    </section>
  );
}
