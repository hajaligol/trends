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
 * Homepage "hero" product section (شگفت‌انگیزها). The title sits in a
 * solid deep-purple rounded band spanning the container (lavender flame disc, white title, a
 * short yellow rule); the products sit below on a full-width pastel
 * lavender band, each on a white rounded tile. Flat on purpose: no
 * gradient, glow or shadow, and no animation beyond the row's normal
 * sliding arrows (see `SwipeRow`).
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
        <div className="rounded-[clamp(18px,2.8vw,30px)] bg-brand-dark px-[clamp(16px,3vw,40px)] py-[clamp(16px,2.6vw,28px)]">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lavender text-brand-dark sm:h-14 sm:w-14"
            >
              <FlameIcon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
            </span>
            <div>
              <h2 className="m-0 text-[clamp(1.7rem,3.6vw,2.7rem)] font-extrabold leading-[1.25] text-white">
                شگفت‌انگیزها
              </h2>
              <span
                aria-hidden="true"
                className="mt-2 block h-[3px] w-12 rounded-full bg-yellow"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[clamp(18px,2.8vw,30px)] bg-lavender/60 px-[clamp(14px,3vw,40px)] py-[clamp(18px,3vw,36px)]">
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
                productsLabel={COLLECTIONS.featured.title}
              />
            )}
          </SwipeRow>
        </div>
      </Container>
    </section>
  );
}
