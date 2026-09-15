import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { VariantSelector } from "@/components/catalog/VariantSelector";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { getProductDetailBySlug, getRelatedProducts } from "@/domains/catalog/queries";
import { getApprovedReviewsForProduct } from "@/domains/reviews/queries";
import { ReviewsSection } from "@/components/catalog/ReviewsSection";
import { SITE_URL } from "@/lib/site-config";
import { safeJsonLd } from "@/lib/utils/safe-json-ld";

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

  const title = product.seoTitle ?? product.title;
  const description = product.seoDescription ?? product.shortDescription ?? `${product.title} — خرید از ترندز`;
  const canonicalPath = `/product/${product.slug}`;
  const firstImage = product.images[0];

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      url: canonicalPath,
      title,
      description,
      type: "website",
      images: firstImage ? [{ url: firstImage.url, alt: firstImage.altText }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const relatedProducts = await getRelatedProducts(product.categorySlug, product.id);
  const reviewSummary = await getApprovedReviewsForProduct(product.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.images.map((image) => image.url),
    url: `${SITE_URL}/product/${product.slug}`,
    // Only present when there's at least one approved review — schema.org
    // recommends omitting `aggregateRating` entirely rather than
    // fabricating a rating from zero reviews.
    aggregateRating:
      reviewSummary.averageRating !== null
        ? {
            "@type": "AggregateRating",
            ratingValue: reviewSummary.averageRating,
            reviewCount: reviewSummary.approvedCount,
          }
        : undefined,
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      priceCurrency: "IRR",
      // Storefront prices are in Toman (see product-variants.ts's header
      // comment on the canonical money unit); schema.org's `price` field
      // itself has no unit, so this is deliberately not converted to
      // Rial here — it just mirrors what's shown on the page.
      price: variant.priceToman,
      availability:
        variant.stockState === "out-of-stock"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      sku: variant.id,
    })),
  };

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
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

        <div className="mt-16 border-t border-line pt-10">
          <ReviewsSection productId={product.id} productSlug={product.slug} summary={reviewSummary} />
        </div>
      </Container>
    </main>
  );
}
