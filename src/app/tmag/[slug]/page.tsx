import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { MarkdownContent } from "@/components/blog/MarkdownContent";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { BlogCard, BlogCover, BlogMiniCard } from "@/components/blog/BlogCard";
import { BlogComments } from "@/components/blog/BlogComments";
import { extractHeadings, readingMinutes, countWords } from "@/domains/blog/markdown";
import { formatBlogDate, isoDate } from "@/domains/blog/format";
import { BLOG_BASE, blogCategoryHref, blogPostHref } from "@/domains/blog/paths";
import { getApprovedComments, getLatestPosts, getLivePostBySlug, getRelatedPosts } from "@/domains/blog/queries";
import { normalizeSlugParam } from "@/domains/catalog/slug";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { excerptFrom } from "@/domains/blog/format";
import { safeJsonLd } from "@/lib/utils/safe-json-ld";
import { toPersianDigits } from "@/lib/utils/persian-digits";

// Static + on-demand: admin edits and comment moderation revalidate the page;
// the timer is the fallback (and publishes scheduled articles).
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

/** `cache()`'d so `generateMetadata` and the page body share one query. */
const loadPost = cache((rawSlug: string) => getLivePostBySlug(normalizeSlugParam(rawSlug)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await loadPost((await params).slug);
  if (!post) return { title: "مقاله پیدا نشد", robots: { index: false, follow: false } };

  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? excerptFrom(post.excerpt, 160);
  const canonical = blogPostHref(post.slug);

  return {
    title,
    description,
    keywords: post.tags.length > 0 ? post.tags : undefined,
    authors: [{ name: post.authorName }],
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      publishedTime: isoDate(post.publishedAt),
      modifiedTime: isoDate(post.updatedAt),
      authors: [post.authorName],
      section: post.categoryName ?? undefined,
      tags: post.tags,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.coverImageAlt || post.title }] : undefined,
    },
    twitter: {
      card: post.coverImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await loadPost((await params).slug);
  if (!post) notFound();

  const [related, latest, comments] = await Promise.all([
    getRelatedPosts(post, 3),
    getLatestPosts(5, post.id),
    getApprovedComments(post.id),
  ]);

  const headings = extractHeadings(post.content);
  const minutes = readingMinutes(post.content);
  const url = `${SITE_URL}${blogPostHref(post.slug)}`;
  const image = post.coverImageUrl ? `${SITE_URL}${post.coverImageUrl}` : undefined;
  // "Updated" is only shown when it is meaningfully later than publication.
  const wasUpdated = post.updatedAt.getTime() - post.publishedAt.getTime() > 24 * 60 * 60 * 1000;

  /**
   * Structured data for search engines and AI answer engines (SEO + GEO):
   * the article itself (author, dates, language, topic, length), its place in
   * the site, and its FAQ as explicit question/answer pairs.
   */
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      headline: post.title,
      description: post.seoDescription ?? post.excerpt,
      image: image ? [image] : undefined,
      datePublished: isoDate(post.publishedAt),
      dateModified: isoDate(post.updatedAt),
      author: { "@type": "Person", name: post.authorName },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/assets/brand/logo.webp` } },
      isPartOf: { "@type": "Blog", name: "تی‌مگ", url: `${SITE_URL}${BLOG_BASE}` },
      articleSection: post.categoryName ?? undefined,
      keywords: post.tags.length > 0 ? post.tags.join("، ") : undefined,
      wordCount: countWords(post.content),
      timeRequired: `PT${minutes}M`,
      inLanguage: "fa-IR",
      commentCount: comments.length,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "صفحه اصلی", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "تی‌مگ", item: `${SITE_URL}${BLOG_BASE}` },
        ...(post.categoryName && post.categorySlug
          ? [{ "@type": "ListItem", position: 3, name: post.categoryName, item: `${SITE_URL}${blogCategoryHref(post.categorySlug)}` }]
          : []),
        { "@type": "ListItem", position: post.categoryName ? 4 : 3, name: post.title, item: url },
      ],
    },
  ];
  if (post.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: post.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }
  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Container>
        <Breadcrumbs
          items={[
            { label: "صفحه اصلی", href: "/" },
            { label: "تی‌مگ", href: BLOG_BASE },
            ...(post.categoryName && post.categorySlug ? [{ label: post.categoryName, href: blogCategoryHref(post.categorySlug) }] : []),
            { label: post.title },
          ]}
        />

        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="min-w-0">
            <header className="mb-6">
              {post.categoryName && post.categorySlug && (
                <Link
                  href={blogCategoryHref(post.categorySlug)}
                  className="mb-3 inline-block rounded-full bg-lavender px-4 py-1.5 text-[0.82rem] font-semibold text-ink hover:bg-lavender/70"
                >
                  {post.categoryName}
                </Link>
              )}
              <h1 className="m-0 mb-4 text-[clamp(1.55rem,3.2vw,2.35rem)] font-bold leading-[1.7] text-ink">
                {post.title}
              </h1>
              <p className="m-0 mb-5 text-[1.05rem] leading-9 text-text-secondary">{post.excerpt}</p>

              <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.85rem] text-text-secondary">
                <span>
                  نویسنده: <span className="font-semibold text-ink">{post.authorName}</span>
                </span>
                <span>
                  انتشار:{" "}
                  <time dateTime={isoDate(post.publishedAt)}>
                    {formatBlogDate(post.publishedAt)}
                  </time>
                </span>
                {wasUpdated && (
                  <span>
                    به‌روزرسانی:{" "}
                    <time dateTime={isoDate(post.updatedAt)}>
                      {formatBlogDate(post.updatedAt)}
                    </time>
                  </span>
                )}
                <span>زمان مطالعه: {toPersianDigits(minutes)} دقیقه</span>
                <a href="#comments" className="hover:text-ink">
                  {toPersianDigits(comments.length)} دیدگاه
                </a>
              </p>
            </header>

            {post.coverImageUrl && (
              <div className="mb-8 overflow-hidden rounded-[22px]">
                <BlogCover post={post} priority sizes="(min-width: 1024px) 760px, 100vw" className="aspect-[16/9]" />
              </div>
            )}

            {/* Mobile/tablet: the table of contents sits above the text; from lg it is the sticky sidebar. */}
            {headings.length >= 2 && (
              <details className="mb-6 rounded-[18px] border border-line bg-white lg:hidden">
                <summary className="cursor-pointer list-none px-5 py-3.5 text-[0.95rem] font-bold text-ink">فهرست مطالب</summary>
                <div className="px-2 pb-3">
                  <TableOfContents headings={headings} bare />
                </div>
              </details>
            )}

            {post.keyTakeaways.length > 0 && (
              <aside aria-labelledby="takeaways-title" className="mb-8 rounded-[22px] bg-sage/45 p-5 sm:p-6">
                <h2 id="takeaways-title" className="m-0 mb-3 text-[1.05rem] font-bold text-ink">
                  خلاصه‌ی مقاله
                </h2>
                <ul className="m-0 flex list-disc flex-col gap-1.5 ps-5 text-[0.98rem] leading-8 text-ink/90 marker:text-brand">
                  {post.keyTakeaways.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </aside>
            )}

            <MarkdownContent>{post.content}</MarkdownContent>

            {post.tags.length > 0 && (
              <ul aria-label="برچسب‌ها" className="m-0 mt-8 flex list-none flex-wrap gap-2 p-0">
                {post.tags.map((tag) => (
                  <li key={tag} className="rounded-full bg-ink/6 px-3.5 py-1.5 text-[0.8rem] text-ink/80">
                    #{tag.replace(/\s+/g, "_")}
                  </li>
                ))}
              </ul>
            )}

            {post.faq.length > 0 && (
              <section aria-labelledby="faq-title" className="mt-10">
                <h2 id="faq-title" className="m-0 mb-4 text-[clamp(1.2rem,2.2vw,1.5rem)] font-bold text-ink">
                  پرسش‌های متداول
                </h2>
                <div className="flex flex-col gap-3">
                  {post.faq.map((item) => (
                    <details key={item.question} className="group rounded-[18px] border border-line bg-white open:bg-header-bg/60">
                      <summary className="cursor-pointer list-none px-5 py-4 text-[0.98rem] font-bold leading-8 text-ink">{item.question}</summary>
                      <p className="m-0 px-5 pb-5 text-[0.95rem] leading-8 text-ink/85">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </article>

          <aside aria-label="فهرست مطالب" className="hidden lg:block">
            <div className="sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto">
              <TableOfContents headings={headings} />
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-title" className="mt-14">
            <h2 id="related-title" className="m-0 mb-5 text-[clamp(1.2rem,2.2vw,1.5rem)] font-bold text-ink">
              مقالات مفید بیشتر
            </h2>
            <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <BlogCard post={item} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {latest.length > 0 && (
          <section aria-labelledby="latest-title" className="mt-12">
            <h2 id="latest-title" className="m-0 mb-5 text-[clamp(1.2rem,2.2vw,1.5rem)] font-bold text-ink">
              آخرین مقالات
            </h2>
            <ul className="m-0 grid list-none grid-cols-1 gap-x-8 gap-y-5 rounded-[22px] border border-line bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((item) => (
                <li key={item.id}>
                  <BlogMiniCard post={item} />
                </li>
              ))}
            </ul>
            <p className="mb-0 mt-4">
              <Link href={BLOG_BASE} className="text-[0.92rem] font-semibold text-ink underline underline-offset-4">
                همه‌ی مقالات تی‌مگ
              </Link>
            </p>
          </section>
        )}

        <div className="mt-14 max-w-3xl">
          <BlogComments postSlug={post.slug} comments={comments} loginHref="/login" />
        </div>
      </Container>
    </main>
  );
}
