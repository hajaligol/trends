import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SectionHead } from "@/components/home/SectionHead";
import type { CatalogProductSummary } from "@/domains/catalog/queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * Homepage "best sellers" row: same 5/3/2 column grid and `ProductCard` as
 * the featured section, with a rank chip on each product image. `products`
 * is already in rank order (see `getTopSellingProducts`) and only contains
 * products that have really sold, so the section renders nothing when the
 * store has no paid orders yet.
 */
export function TopSellingProducts({ products }: { products: CatalogProductSummary[] }) {
  if (products.length === 0) return null;

  return (
    <section id="top-selling" className="py-[clamp(30px,5vw,54px)]">
      <Container>
        <SectionHead
          eyebrow="محبوب مشتریان"
          title="پرفروش‌ترین محصولات"
          viewAllHref="#top-selling"
        />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product, index) => {
            const rank = index + 1;
            return (
              <div key={product.id} className="relative">
                <ProductCard product={product} />
                {/* Same box as the card's 4:5 image (which is its first
                    child, full width), so the chip can sit on the image's
                    bottom corner without touching ProductCard — the discount
                    badge (top-right) and wishlist button (top-left) keep
                    their corners. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/5]">
                  <span
                    role="img"
                    aria-label={`رتبه ${toPersianDigits(rank)} در پرفروش‌ترین‌ها`}
                    className={`absolute bottom-2.5 end-2.5 flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[0.9rem] font-bold shadow-md ${
                      rank <= 3 ? "bg-brand text-white" : "bg-white text-ink"
                    }`}
                  >
                    {toPersianDigits(rank)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
