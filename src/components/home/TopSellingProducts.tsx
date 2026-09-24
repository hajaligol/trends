import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SectionHead } from "@/components/home/SectionHead";
import { LayersArrowUpIcon } from "@/components/ui/icons";
import type { CatalogProductSummary } from "@/domains/catalog/queries";

/**
 * Homepage "best sellers" row: same 5/3/2 column grid and `ProductCard` as
 * the featured section. `products` is already in rank order (see
 * `getTopSellingProducts`) and only contains products that have really
 * sold, so the section renders nothing when the store has no paid orders
 * yet.
 */
export function TopSellingProducts({ products }: { products: CatalogProductSummary[] }) {
  if (products.length === 0) return null;

  return (
    <section id="top-selling" className="py-[clamp(30px,5vw,54px)]">
      <Container>
        <SectionHead
          title="پرفروش‌ترین محصولات"
          icon={<LayersArrowUpIcon className="h-[1.1em] w-[1.1em] text-brand" />}
          viewAllHref="#top-selling"
        />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}
