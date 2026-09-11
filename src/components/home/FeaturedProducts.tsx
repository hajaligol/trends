import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SectionHead } from "@/components/home/SectionHead";
import type { CatalogProductSummary } from "@/domains/catalog/queries";

/**
 * Mirrors #featured .product-grid in the prototype: 5 columns desktop,
 * 3 from ~640px, 2 below that. Real catalog data since Phase 4 — see
 * `getFeaturedProducts` in `@/domains/catalog/queries`.
 */
export function FeaturedProducts({ products }: { products: CatalogProductSummary[] }) {
  return (
    <section id="featured" className="py-[clamp(30px,5vw,54px)]">
      <Container>
        <SectionHead
          eyebrow="مجموعه‌های ویژه"
          title="پیشنهادهای برتر برای شما"
          viewAllHref="#featured"
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
