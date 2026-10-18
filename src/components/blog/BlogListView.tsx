import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/catalog/Breadcrumbs";
import { BlogCard, BlogLeadCard } from "@/components/blog/BlogCard";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { BLOG_BASE, blogCategoryHref } from "@/domains/blog/paths";
import type { BlogCategoryWithCount, BlogListPage } from "@/domains/blog/queries";

/** Shared body of `/tmag` and `/tmag/category/[slug]`: title, category chips, lead card, grid, pagination. */
export function BlogListView({
  title,
  intro,
  breadcrumbs,
  categories,
  activeCategorySlug,
  list,
  hrefFor,
}: {
  title: string;
  intro: string;
  breadcrumbs: BreadcrumbItem[];
  categories: BlogCategoryWithCount[];
  activeCategorySlug?: string;
  list: BlogListPage;
  hrefFor: (page: number) => string;
}) {
  // The newest article leads the first page only; later pages are plain grids.
  const lead = list.page === 1 ? list.posts[0] : undefined;
  const gridPosts = list.page === 1 ? list.posts.slice(1) : list.posts;

  const chip = "rounded-full border px-4 py-2 text-[0.88rem] font-semibold transition-colors";

  return (
    <main className="py-[clamp(24px,4vw,40px)]">
      <Container>
        <Breadcrumbs items={breadcrumbs} />
        <header className="mb-7 max-w-3xl">
          <h1 className="m-0 mb-2 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold leading-[1.6]">{title}</h1>
          <p className="m-0 text-[0.98rem] leading-8 text-text-secondary">{intro}</p>
        </header>

        {categories.length > 0 && (
          <nav aria-label="دسته‌بندی مقالات" className="mb-8 flex flex-wrap gap-2">
            <Link
              href={BLOG_BASE}
              aria-current={!activeCategorySlug ? "page" : undefined}
              className={`${chip} ${!activeCategorySlug ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-ink/5"}`}
            >
              همه‌ی مقالات
            </Link>
            {categories.map((category) => {
              const active = category.slug === activeCategorySlug;
              return (
                <Link
                  key={category.id}
                  href={blogCategoryHref(category.slug)}
                  aria-current={active ? "page" : undefined}
                  className={`${chip} ${active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-ink/5"}`}
                >
                  {category.name}
                </Link>
              );
            })}
          </nav>
        )}

        {list.total === 0 ? (
          <p className="rounded-[14px] bg-benefit-bg px-5 py-10 text-center text-text-secondary">هنوز مقاله‌ای منتشر نشده است.</p>
        ) : (
          <>
            {lead && (
              <div className="mb-6">
                <BlogLeadCard post={lead} />
              </div>
            )}
            {gridPosts.length > 0 && (
              <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {gridPosts.map((post) => (
                  <li key={post.id}>
                    <BlogCard post={post} />
                  </li>
                ))}
              </ul>
            )}
            <BlogPagination page={list.page} totalPages={list.totalPages} hrefFor={hrefFor} />
          </>
        )}
      </Container>
    </main>
  );
}
