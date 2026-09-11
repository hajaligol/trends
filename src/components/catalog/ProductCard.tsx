import Image from "next/image";
import Link from "next/link";
import { AssetSlot } from "@/components/ui/AssetSlot";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { DiscountBadge } from "@/components/catalog/DiscountBadge";
import { StockBadge } from "@/components/catalog/StockBadge";
import type { CatalogProductSummary } from "@/domains/catalog/queries";
import { formatToman } from "@/lib/utils/money";

/**
 * Real catalog product card — mirrors `.product-card` in the prototype,
 * now driven by `CatalogProductSummary` (a real database read model)
 * instead of Phase 2's `DemoProduct` fixture. Used by the homepage's
 * featured-products section and by category listing grids so both stay
 * visually identical.
 *
 * No real product photography exists yet (see `seed.ts`'s notes), so
 * `images` is empty for every product today; the `next/image` branch is
 * wired up and ready for when Phase 11's admin media upload lands.
 */
export function ProductCard({ product }: { product: CatalogProductSummary }) {
  const primaryImage = product.images[0];
  const colorSwatches = product.colorHexes.slice(0, 4);

  return (
    <article className="flex flex-col gap-2.5">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[14px] bg-card-image">
        <Link href={`/product/${product.slug}`} className="absolute inset-0 block">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          ) : (
            <AssetSlot label={product.title} rounded="none" className="h-full w-full" />
          )}
        </Link>
        <DiscountBadge percent={product.discountPercent} />
        {/* Sibling of the image link, not nested inside it — a <button>
         * inside an <a> is invalid HTML and breaks keyboard/AT navigation. */}
        <WishlistButton productName={product.title} />
      </div>
      <div>
        <Link href={`/product/${product.slug}`} className="mb-1 block text-[0.95rem] font-semibold">
          {product.title}
        </Link>
        <p className="mb-1.5 text-[0.9rem] text-text-secondary">
          {product.fromPriceToman !== null ? formatToman(product.fromPriceToman) : "—"}
        </p>
        {colorSwatches.length > 0 && (
          <div className="mb-1.5 flex gap-1.5">
            {colorSwatches.map((hex, index) => (
              <span
                key={`${product.id}-swatch-${index}`}
                aria-hidden="true"
                style={{ backgroundColor: hex }}
                className="h-3 w-3 rounded-full border border-ink/15"
              />
            ))}
          </div>
        )}
        <StockBadge state={product.stockState} />
      </div>
    </article>
  );
}
