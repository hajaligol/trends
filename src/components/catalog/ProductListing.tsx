import type { ReactNode } from "react";
import { InfiniteProductGrid } from "@/components/catalog/InfiniteProductGrid";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import type { LoadMoreSource } from "@/domains/catalog/load-more-schema";
import { INFINITE_SCROLL_MAX_PAGE } from "@/domains/catalog/presentation";
import type { CatalogProductSummary } from "@/domains/catalog/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * The product grid of a list page. Pages 1..5 → infinite scroll; page 6+ →
 * a plain page with numbered pagination (see `INFINITE_SCROLL_MAX_PAGE`).
 * `pagination(page)` renders the page's own pagination component.
 */
export function ProductListing({
  products,
  emptyMessage,
  total,
  totalPages,
  infinite,
  loadedThrough,
  source,
  baseHref,
  showCount = false,
  pagination,
}: {
  products: CatalogProductSummary[];
  emptyMessage: string;
  total: number;
  totalPages: number;
  infinite: boolean;
  loadedThrough: number;
  source: LoadMoreSource;
  baseHref: string;
  showCount?: boolean;
  pagination: (page: number) => ReactNode;
}) {
  if (products.length === 0) return <ProductGrid products={products} emptyMessage={emptyMessage} />;

  if (!infinite) {
    return (
      <>
        <ProductGrid products={products} emptyMessage={emptyMessage} />
        {pagination(loadedThrough)}
        {showCount && (
          <p className="mt-4 text-center text-[0.82rem] text-text-secondary">
            نمایش {toPersianDigits(products.length)} محصول از {toPersianDigits(total)} محصول
          </p>
        )}
      </>
    );
  }

  const lastInfinitePage = Math.max(1, Math.min(INFINITE_SCROLL_MAX_PAGE, totalPages));
  return (
    <InfiniteProductGrid
      source={source}
      initialCards={products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
      initialCount={products.length}
      initialPage={loadedThrough}
      lastInfinitePage={lastInfinitePage}
      total={total}
      baseHref={baseHref}
      showCount={showCount}
      fallbackPagination={pagination(loadedThrough)}
      finalPagination={totalPages > INFINITE_SCROLL_MAX_PAGE ? pagination(lastInfinitePage) : null}
    />
  );
}
