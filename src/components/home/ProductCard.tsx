import { AssetSlot } from "@/components/ui/AssetSlot";
import { WishlistButton } from "@/components/ui/WishlistButton";
import type { DemoProduct } from "@/domains/catalog/demo-data";

const FIVE_STARS = "★★★★★";

/** Featured-product card. Mirrors .product-card in the prototype. */
export function ProductCard({ product }: { product: DemoProduct }) {
  return (
    <article className="flex flex-col gap-2.5">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[14px] bg-card-image">
        <AssetSlot label={product.name} rounded="none" className="h-full w-full" />
        <WishlistButton productName={product.name} />
      </div>
      <div>
        <p className="mb-1 text-[0.95rem] font-semibold">{product.name}</p>
        <p className="mb-1.5 text-[0.9rem] text-text-secondary">{product.price}</p>
        <p className="flex items-center gap-1.5 text-[0.82rem] text-text-secondary">
          <span className="tracking-widest text-[#D9A441]">{FIVE_STARS}</span> (
          {product.reviewCount})
        </p>
      </div>
    </article>
  );
}
