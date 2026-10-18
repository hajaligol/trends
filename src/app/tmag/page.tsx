import type { Metadata } from "next";
import { BlogListView } from "@/components/blog/BlogListView";
import { getBlogIndexEntries, listBlogCategories, listLivePosts } from "@/domains/blog/queries";
import { BLOG_BASE, BLOG_DESCRIPTION, BLOG_TITLE, blogListHref, blogPostHref } from "@/domains/blog/paths";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { safeJsonLd } from "@/lib/utils/safe-json-ld";
import { toPersianDigits } from "@/lib/utils/persian-digits";

// Admin edits revalidate this page; the timer also publishes scheduled articles.
export const revalidate = 300;

type Props = { searchParams: Promise<{ page?: string }> };

function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = parsePage((await searchParams).page);
  const suffix = page > 1 ? ` — صفحه ${toPersianDigits(page)}` : "";
  const canonical = blogListHref(page);
  return {
    title: { absolute: `${BLOG_TITLE}${suffix} | ${SITE_NAME}` },
    description: BLOG_DESCRIPTION,
    alternates: { canonical, types: { "application/rss+xml": `${BLOG_BASE}/feed.xml` } },
    openGraph: { url: canonical, title: BLOG_TITLE, description: BLOG_DESCRIPTION, type: "website" },
  };
}

/** `/tmag` — the magazine's home: newest article as the lead, the rest as a paginated grid. */
export default async function BlogIndexPage({ searchParams }: Props) {
  const page = parsePage((await searchParams).page);
  const [list, categories, latestEntries] = await Promise.all([listLivePosts({ page }), listBlogCategories(), getBlogIndexEntries(20)]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${SITE_URL}${BLOG_BASE}#blog`,
        name: BLOG_TITLE,
        description: BLOG_DESCRIPTION,
        url: `${SITE_URL}${BLOG_BASE}`,
        inLanguage: "fa-IR",
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        blogPost: latestEntries.map((entry) => ({
          "@type": "BlogPosting",
          headline: entry.title,
          url: `${SITE_URL}${blogPostHref(entry.slug)}`,
          datePublished: entry.publishedAt.toISOString(),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "صفحه اصلی", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "تی‌مگ", item: `${SITE_URL}${BLOG_BASE}` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <BlogListView
        title={BLOG_TITLE}
        intro={BLOG_DESCRIPTION}
        breadcrumbs={[{ label: "صفحه اصلی", href: "/" }, { label: "تی‌مگ" }]}
        categories={categories}
        list={list}
        hrefFor={blogListHref}
      />
    </>
  );
}
