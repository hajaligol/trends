import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { VariantSelector } from "@/components/catalog/VariantSelector";
import { WishlistToggleButton } from "@/components/ui/WishlistButton";
import { ScrollToTopOnMount } from "@/components/utility/ScrollToTopOnMount";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { getProductDetailBySlug, getRelatedProducts } from "@/domains/catalog/queries";
import { getApprovedReviewsForProduct } from "@/domains/reviews/queries";
import { ReviewsSection } from "@/components/catalog/ReviewsSection";
import { ProductSpecs } from "@/components/catalog/ProductSpecs";
import { ProductTabs } from "@/components/catalog/ProductTabs";
import { StarRating } from "@/components/catalog/StarRating";
import { toPersianDigits } from "@/lib/utils/persian-digits";
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
      <ScrollToTopOnMount trackKey={product.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <Container>
        <Breadcrumbs
          items={[
            { label: "صفحه اصلی", href: "/" },
            ...product.categoryTrail.map((category) => ({
              label: category.name,
              href: `/category/${category.slug}`,
            })),
            { label: product.title },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductGallery title={product.title} images={product.images} />

          <div className="flex flex-col gap-6 lg:py-2">
            <div className="flex flex-col gap-2">
              {product.brand && <p className="text-[0.88rem] text-text-secondary">{product.brand}</p>}
              <h1 className="m-0 text-[clamp(1.5rem,3vw,2.1rem)] leading-snug font-bold">{product.title}</h1>
              <p className="m-0 text-[0.82rem] text-text-secondary">کد کالا: {toPersianDigits(product.productCode)}</p>
              {reviewSummary.averageRating !== null && (
                <a
                  href="#reviews"
                  className="inline-flex w-fit items-center gap-2 rounded-full text-[0.85rem] text-text-secondary hover:text-ink"
                >
                  <StarRating rating={reviewSummary.averageRating} />
                  <span>
                    {toPersianDigits(reviewSummary.averageRating).replace(".", "٫")} (
                    {toPersianDigits(reviewSummary.approvedCount)} دیدگاه)
                  </span>
                </a>
              )}
            </div>

            {product.shortDescription && (
              <p className="text-[0.95rem] leading-8 text-text-secondary">{product.shortDescription}</p>
            )}

            <div className="border-t border-line pt-6">
              <VariantSelector
                variants={product.variants}
                secondaryAction={
                  <WishlistToggleButton productId={product.id} productName={product.title} />
                }
              />
            </div>

            <p className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-5 text-[0.85rem] text-text-secondary">
              <Link href="/shipping-policy" className="underline-offset-4 hover:text-ink hover:underline">
                راهنمای ارسال
              </Link>
              <Link href="/returns-policy" className="underline-offset-4 hover:text-ink hover:underline">
                شرایط بازگشت کالا
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-14 border-t border-line pt-10 lg:mt-20">
          <ProductTabs
            reviewCount={reviewSummary.approvedCount}
            specs={<ProductSpecs product={product} />}
            reviews={
              <ReviewsSection productId={product.id} productSlug={product.slug} summary={reviewSummary} />
            }
          />
        </div>

        {relatedProducts.length > 0 && (
          <section aria-labelledby="related-products-heading" className="mt-16 lg:mt-20">
            <h2 id="related-products-heading" className="mb-6 text-[clamp(1.3rem,2.4vw,1.75rem)] font-bold">
              محصولات مرتبط
            </h2>
            <ProductGrid products={relatedProducts} />
          </section>
        )}
      </Container>
    </main>
  );
}
