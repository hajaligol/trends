import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SectionTitleBand } from "@/components/home/SectionTitleBand";
import { SwipeRow } from "@/components/home/SwipeRow";
import { ShowAllTile } from "@/components/home/ShowAllTile";
import { TopSellingMedalIcon } from "@/components/ui/icons";
import { COLLECTIONS, HOME_ROW_MAX_PRODUCTS } from "@/domains/catalog/presentation";
import type { CatalogProductSummary } from "@/domains/catalog/queries";

/**
 * Homepage "best sellers" row: same swipeable row and `ProductCard` as
 * the featured section (more than `HOME_ROW_MAX_PRODUCTS` products → "show all"
 * tile at the end; arrows always shown). `products` is already in rank order (see
 * `getTopSellingProducts`) and only contains products that have really
 * sold, so the section renders nothing when the store has no paid orders
 * yet.
 */
export function TopSellingProducts({ products }: { products: CatalogProductSummary[] }) {
  if (products.length === 0) return null;
  const hasMore = products.length > HOME_ROW_MAX_PRODUCTS;
  const visible = products.slice(0, HOME_ROW_MAX_PRODUCTS);

  return (
    <section id="top-selling" className="py-[clamp(30px,5vw,54px)]">
      <SectionTitleBand
        title="پرفروش‌ترین محصولات"
        icon={<TopSellingMedalIcon aria-hidden="true" className="h-[1.6em] w-auto" />}
      />
      <Container className="mt-[clamp(20px,3vw,34px)]">
        <SwipeRow
          label={COLLECTIONS["top-selling"].title}
          showArrows
          gapClassName="gap-5"
          itemClassName="basis-[calc((100%_-_20px)/2)] sm:basis-[calc((100%_-_40px)/3)] lg:basis-[calc((100%_-_80px)/5)]"
        >
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} showOptions={false} />
          ))}
          {hasMore && (
            <ShowAllTile key="show-all" href="/collection/top-selling" label="مشاهده همه" productsLabel={COLLECTIONS["top-selling"].title} />
          )}
        </SwipeRow>
      </Container>
    </section>
  );
}
