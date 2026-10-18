import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/domains/catalog/queries";
import { COLLECTIONS } from "@/domains/catalog/presentation";
import { SITE_URL } from "@/lib/site-config";
import { productHref } from "@/domains/catalog/slug";
import { getLiveCampaignSlugs } from "@/domains/campaigns/landing";
import { campaignHref } from "@/domains/campaigns/slug";
import { getBlogCategorySlugs, getBlogIndexEntries } from "@/domains/blog/queries";
import { BLOG_BASE, blogCategoryHref, blogPostHref } from "@/domains/blog/paths";

const STATIC_PAGES = [
  "/accessories",
  "/brands",
  "/about",
  "/contact",
  "/faq",
  "/shipping-policy",
  "/returns-policy",
  "/privacy-policy",
  "/terms",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ categories, products }, campaignSlugs, blogPosts, blogCategories] = await Promise.all([
    getSitemapEntries(),
    getLiveCampaignSlugs(),
    getBlogIndexEntries(),
    getBlogCategorySlugs(),
  ]);

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
    // T-Mag: the magazine home, its category pages and every live article
    // (with its cover image, so image search can pick it up).
    { url: `${SITE_URL}${BLOG_BASE}`, lastModified: blogPosts[0]?.updatedAt, changeFrequency: "daily" as const, priority: 0.7 },
    ...blogCategories.map((category) => ({
      url: `${SITE_URL}${blogCategoryHref(category.slug)}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...blogPosts.map((post) => ({
      url: `${SITE_URL}${blogPostHref(post.slug)}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      images: post.coverImageUrl ? [`${SITE_URL}${post.coverImageUrl}`] : undefined,
    })),
    ...Object.keys(COLLECTIONS).map((slug) => ({
      url: `${SITE_URL}/collection/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...campaignSlugs.map((slug) => ({
      url: `${SITE_URL}${campaignHref(slug)}`,
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
      url: `${SITE_URL}${productHref(product.slug)}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
