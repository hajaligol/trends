import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogListView } from "@/components/blog/BlogListView";
import { getBlogCategoryBySlug, listBlogCategories, listLivePosts } from "@/domains/blog/queries";
import { BLOG_BASE, BLOG_TITLE, blogCategoryHref } from "@/domains/blog/paths";
import { normalizeSlugParam } from "@/domains/catalog/slug";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { safeJsonLd } from "@/lib/utils/safe-json-ld";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const slug = normalizeSlugParam((await params).slug);
  const page = parsePage((await searchParams).page);
  const category = await getBlogCategoryBySlug(slug);
  if (!category) return { title: "دسته پیدا نشد", robots: { index: false, follow: false } };

  const suffix = page > 1 ? ` — صفحه ${toPersianDigits(page)}` : "";
  const title = `مقالات ${category.name} | تی‌مگ${suffix}`;
  const description = category.description ?? `مقالات دسته‌ی ${category.name} در تی‌مگ، مجله مد و استایل ${SITE_NAME}.`;
  const canonical = blogCategoryHref(category.slug, page);
  return {
    title: { absolute: `${title} | ${SITE_NAME}` },
    description,
    alternates: { canonical },
    openGraph: { url: canonical, title, description, type: "website" },
  };
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const slug = normalizeSlugParam((await params).slug);
  const page = parsePage((await searchParams).page);
  const category = await getBlogCategoryBySlug(slug);
  if (!category) notFound();

  const [list, categories] = await Promise.all([listLivePosts({ page, categoryId: category.id }), listBlogCategories()]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "صفحه اصلی", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "تی‌مگ", item: `${SITE_URL}${BLOG_BASE}` },
      { "@type": "ListItem", position: 3, name: category.name, item: `${SITE_URL}${blogCategoryHref(category.slug)}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <BlogListView
        title={`مقالات ${category.name}`}
        intro={category.description ?? `همه‌ی مقاله‌های دسته‌ی ${category.name} در ${BLOG_TITLE}.`}
        breadcrumbs={[{ label: "صفحه اصلی", href: "/" }, { label: "تی‌مگ", href: BLOG_BASE }, { label: category.name }]}
        categories={categories}
        activeCategorySlug={category.slug}
        list={list}
        hrefFor={(n) => blogCategoryHref(category.slug, n)}
      />
    </>
  );
}
