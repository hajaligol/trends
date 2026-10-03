import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/domains/catalog/queries";
import { COLLECTIONS } from "@/domains/catalog/presentation";
import { SITE_URL } from "@/lib/site-config";

const STATIC_PAGES = [
  "/accessories",
  "/about",
  "/contact",
  "/faq",
  "/shipping-policy",
  "/returns-policy",
  "/privacy-policy",
  "/terms",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, products } = await getSitemapEntries();

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    // Phase 12's public content pages (§8 "important storefront pages
    // have useful metadata") — static/rarely-changing, so no
    // `lastModified` and a low priority relative to catalog pages.
    ...STATIC_PAGES.map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
    ...Object.keys(COLLECTIONS).map((slug) => ({
      url: `${SITE_URL}/collection/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...categories.map((category) => ({
      url: `${SITE_URL}/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
