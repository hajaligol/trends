import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { VariantSelector } from "@/components/catalog/VariantSelector";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { getProductDetailBySlug, getRelatedProducts } from "@/domains/catalog/queries";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

/** `cache()`'d so `generateMetadata` and the page body share one fetch
 * for the same request instead of hitting the DB twice. */
const loadProduct = cache((slug: string) => getProductDetailBySlug(slug));

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "محصول پیدا نشد" };
  return {
    title: product.title,
    description: product.shortDescription ?? `${product.title} — خرید از ترندز`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const relatedProducts = await getRelatedProducts(product.categorySlug, product.id);

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <Breadcrumbs
          items={[
            { label: "صفحه اصلی", href: "/" },
            { label: product.categoryName, href: `/category/${product.categorySlug}` },
            { label: product.title },
          ]}
        />

        <div className="grid gap-10 lg:grid-cols-2">
          <ProductGallery title={product.title} images={product.images} />

          <div className="flex flex-col gap-5">
            <div>
              {product.brand && <p className="mb-1 text-[0.88rem] text-text-secondary">{product.brand}</p>}
              <h1 className="m-0 text-[clamp(1.5rem,3vw,2.1rem)] font-bold">{product.title}</h1>
            </div>

            <VariantSelector variants={product.variants} />

            {product.shortDescription && (
              <p className="text-[0.95rem] leading-7 text-text-secondary">{product.shortDescription}</p>
            )}

            {product.longDescription && (
              <div className="border-t border-line pt-5 text-[0.92rem] leading-8 whitespace-pre-line text-ink/85">
                {product.longDescription}
              </div>
            )}

            {product.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-line px-2.5 py-1 text-[0.78rem] text-text-secondary"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section aria-labelledby="related-products-heading" className="mt-16">
            <h2 id="related-products-heading" className="mb-6 text-[1.3rem] font-bold">
              محصولات مرتبط
            </h2>
            <ProductGrid products={relatedProducts} />
          </section>
        )}
      </Container>
    </main>
  );
}
