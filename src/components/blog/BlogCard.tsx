import Image from "next/image";
import Link from "next/link";
import { NewspaperIcon } from "@/components/ui/icons";
import { formatBlogDate, isoDate } from "@/domains/blog/format";
import { blogPostHref } from "@/domains/blog/paths";
import type { BlogCard as BlogCardData } from "@/domains/blog/queries";

/** Cover image box with a fixed aspect ratio (no layout shift); a soft placeholder when the article has no cover. */
export function BlogCover({
  post,
  sizes,
  priority = false,
  className = "aspect-[16/10]",
}: {
  post: Pick<BlogCardData, "coverImageUrl" | "coverImageAlt" | "title">;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden bg-card-image ${className}`}>
      {post.coverImageUrl ? (
        <Image
          src={post.coverImageUrl}
          alt={post.coverImageAlt || post.title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-lavender/60 text-ink/35">
          <NewspaperIcon strokeWidth={1.25} className="h-14 w-14" />
        </span>
      )}
    </div>
  );
}

function Meta({ post }: { post: BlogCardData }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-2 text-[0.8rem] text-text-secondary">
      {post.categoryName && <span className="font-semibold text-brand">{post.categoryName}</span>}
      {post.categoryName && <span aria-hidden="true">·</span>}
      <time dateTime={isoDate(post.publishedAt)}>{formatBlogDate(post.publishedAt)}</time>
    </p>
  );
}

/** Standard grid card. The whole card is one link (the title), so a screen reader hears one link per article. */
export function BlogCard({ post, priority = false }: { post: BlogCardData; priority?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-white">
      <BlogCover post={post} priority={priority} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <Meta post={post} />
        <h3 className="m-0 text-[1.08rem] font-bold leading-8 text-ink">
          <Link href={blogPostHref(post.slug)} className="after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h3>
        <p className="m-0 line-clamp-3 text-[0.9rem] leading-7 text-text-secondary">{post.excerpt}</p>
      </div>
    </article>
  );
}

/** Large lead card for the newest article on the first page. */
export function BlogLeadCard({ post }: { post: BlogCardData }) {
  return (
    <article className="group relative grid overflow-hidden rounded-[22px] border border-line bg-white lg:grid-cols-[1.25fr_1fr]">
      <BlogCover post={post} priority sizes="(min-width: 1024px) 700px, 100vw" className="aspect-[16/10] lg:aspect-auto lg:min-h-[340px]" />
      <div className="flex flex-col justify-center gap-3 p-6 lg:p-9">
        <Meta post={post} />
        <h2 className="m-0 text-[clamp(1.3rem,2.4vw,1.85rem)] font-bold leading-[1.7] text-ink">
          <Link href={blogPostHref(post.slug)} className="after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h2>
        <p className="m-0 line-clamp-4 text-[0.98rem] leading-8 text-text-secondary">{post.excerpt}</p>
        <span aria-hidden="true" className="mt-1 w-fit rounded-full bg-brand px-5 py-2 text-[0.88rem] font-semibold text-white transition-colors duration-200 group-hover:bg-brand-dark">
          خواندن مقاله
        </span>
      </div>
    </article>
  );
}

/** Compact row (thumbnail + title + date) for «آخرین مقالات». */
export function BlogMiniCard({ post }: { post: BlogCardData }) {
  return (
    <article className="group relative flex items-center gap-3.5">
      <div className="w-[88px] shrink-0 overflow-hidden rounded-[10px]">
        <BlogCover post={post} sizes="88px" className="aspect-[4/3]" />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="m-0 line-clamp-2 text-[0.92rem] font-bold leading-7 text-ink">
          <Link href={blogPostHref(post.slug)} className="after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h3>
        <time dateTime={isoDate(post.publishedAt)} className="text-[0.76rem] text-text-secondary">
          {formatBlogDate(post.publishedAt)}
        </time>
      </div>
    </article>
  );
}
