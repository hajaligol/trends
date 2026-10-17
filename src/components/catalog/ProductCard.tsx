import Link from "next/link";
import { ProductCardMedia } from "@/components/catalog/ProductCardMedia";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { DiscountBadge } from "@/components/catalog/DiscountBadge";
import { StockBadge } from "@/components/catalog/StockBadge";
import type { CatalogProductSummary } from "@/domains/catalog/queries";
import { formatToman } from "@/lib/utils/money";
import { productHref } from "@/domains/catalog/slug";

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
export function ProductCard({
  product,
  showOptions = true,
}: {
  product: CatalogProductSummary;
  /** Hover panel with colours + sizes. Off for the smaller homepage cards. */
  showOptions?: boolean;
}) {
  const colorSwatches = product.colorHexes.slice(0, 4);
  // One short campaign tag: the campaign's name when it changed the price
  // (the % badge already says how much), otherwise what the offer is.
  const highlighted = product.campaigns.find((c) => c.kind !== "free_shipping");
  const promo = highlighted ? (highlighted.changesPrice ? highlighted.name : highlighted.summary) : null;

  return (
    <article className="flex flex-col gap-2.5">
      <ProductCardMedia
        title={product.title}
        href={productHref(product.slug)}
        colorOptions={product.colorOptions}
        sharedImage={product.sharedImage}
        showOptions={showOptions}
      >
        <DiscountBadge percent={product.discountPercent} />
        {/* Sibling of the image link, not nested inside it — a <button>
         * inside an <a> is invalid HTML and breaks keyboard/AT navigation. */}
        <WishlistButton productId={product.id} productName={product.title} />
      </ProductCardMedia>
      <div>
        <Link href={productHref(product.slug)} className="mb-1 block text-[0.95rem] font-semibold">
          {product.title}
        </Link>
        <p className="mb-1.5 text-[0.9rem] text-text-secondary">
          {product.fromPriceToman !== null ? formatToman(product.fromPriceToman) : "—"}
        </p>
        {promo && (
          <p className="mb-1.5 w-fit rounded-full bg-lavender/60 px-2.5 py-0.5 text-[0.72rem] font-semibold text-brand-dark">{promo}</p>
        )}
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
