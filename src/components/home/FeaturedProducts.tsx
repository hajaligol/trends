import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/home/ProductCard";
import { SectionHead } from "@/components/home/SectionHead";
import type { DemoProduct } from "@/domains/catalog/demo-data";

/**
 * Mirrors #featured .product-grid in the prototype: 5 columns desktop,
 * 3 from ~640px, 2 below that. Demo data only — Phase 3 swaps `products`
 * for a real catalog query.
 */
export function FeaturedProducts({ products }: { products: DemoProduct[] }) {
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
