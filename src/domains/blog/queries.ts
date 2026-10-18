import { and, asc, count, desc, eq, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { blogCategories, blogComments, blogPosts, users } from "@/lib/db/schema";
import type { BlogFaqItem } from "@/lib/db/schema";
import { BLOG_PAGE_SIZE } from "@/domains/blog/paths";

/**
 * Storefront reads for T-Mag. Every query here goes through `liveWhere()`:
 * a post is public only when it is `published` AND its `published_at` has
 * arrived (so a future date schedules it). Drafts and scheduled posts never
 * leave this module.
 */

const liveWhere = () => and(eq(blogPosts.status, "published"), lte(blogPosts.publishedAt, sql`now()`));

/** What a card / list row needs — deliberately without the long `content`. */
const cardColumns = {
  id: blogPosts.id,
  slug: blogPosts.slug,
  title: blogPosts.title,
  excerpt: blogPosts.excerpt,
  coverImageUrl: blogPosts.coverImageUrl,
  coverImageAlt: blogPosts.coverImageAlt,
  authorName: blogPosts.authorName,
  publishedAt: blogPosts.publishedAt,
  updatedAt: blogPosts.updatedAt,
  categoryName: blogCategories.name,
  categorySlug: blogCategories.slug,
};

type CardRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorName: string;
  publishedAt: Date | null;
  updatedAt: Date;
  categoryName: string | null;
  categorySlug: string | null;
};

export type BlogCard = Omit<CardRow, "publishedAt"> & { publishedAt: Date };

/** `published_at` is non-null for live posts (DB check + `liveWhere`). */
function toCard(row: CardRow): BlogCard {
  return { ...row, publishedAt: row.publishedAt ?? row.updatedAt };
}

export type BlogCategoryWithCount = { id: string; slug: string; name: string; description: string | null; postCount: number };

/** Active categories that have at least one live post, in display order. */
export async function listBlogCategories(): Promise<BlogCategoryWithCount[]> {
  const rows = await db
    .select({
      id: blogCategories.id,
      slug: blogCategories.slug,
      name: blogCategories.name,
      description: blogCategories.description,
      postCount: count(blogPosts.id),
    })
    .from(blogCategories)
    .innerJoin(blogPosts, and(eq(blogPosts.categoryId, blogCategories.id), liveWhere()))
    .where(eq(blogCategories.isActive, true))
    .groupBy(blogCategories.id)
    .orderBy(asc(blogCategories.displayOrder), asc(blogCategories.name));
  return rows;
}

export async function getBlogCategoryBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(blogCategories)
    .where(and(eq(blogCategories.slug, slug), eq(blogCategories.isActive, true)))
    .limit(1);
  return row ?? null;
}

export type BlogListPage = { posts: BlogCard[]; page: number; totalPages: number; total: number };

/** Newest first. `categoryId` narrows to one category. `page` is clamped to the last page. */
export async function listLivePosts({ page = 1, categoryId }: { page?: number; categoryId?: string } = {}): Promise<BlogListPage> {
  const where = categoryId ? and(liveWhere(), eq(blogPosts.categoryId, categoryId)) : liveWhere();
  const [totalRow] = await db.select({ total: count() }).from(blogPosts).where(where);
  const total = totalRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);

  const rows = await db
    .select(cardColumns)
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
    .where(where)
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
    .limit(BLOG_PAGE_SIZE)
    .offset((safePage - 1) * BLOG_PAGE_SIZE);

  return { posts: rows.map(toCard), page: safePage, totalPages, total };
}

export type BlogPostDetail = BlogCard & {
  content: string;
  tags: string[];
  keyTakeaways: string[];
  faq: BlogFaqItem[];
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string | null;
};

export async function getLivePostBySlug(slug: string): Promise<BlogPostDetail | null> {
  const [row] = await db
    .select({
      ...cardColumns,
      content: blogPosts.content,
      tags: blogPosts.tags,
      keyTakeaways: blogPosts.keyTakeaways,
      faq: blogPosts.faq,
      seoTitle: blogPosts.seoTitle,
      seoDescription: blogPosts.seoDescription,
      categoryId: blogPosts.categoryId,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
    .where(and(eq(blogPosts.slug, slug), liveWhere()))
    .limit(1);
  if (!row) return null;
  return { ...toCard(row), content: row.content, tags: row.tags, keyTakeaways: row.keyTakeaways, faq: row.faq, seoTitle: row.seoTitle, seoDescription: row.seoDescription, categoryId: row.categoryId };
}

/**
 * «مقالات مفید بیشتر»: other live posts ranked by relatedness — +2 for the
 * same category, +1 per shared tag — then newest. Falls back to the newest
 * posts when nothing is related, so the block is never empty on a small blog.
 */
export async function getRelatedPosts(post: { id: string; categoryId: string | null; tags: string[] }, limit = 3): Promise<BlogCard[]> {
  const tagArray = sql`ARRAY[${sql.join(post.tags.map((tag) => sql`${tag}`), sql`, `)}]::text[]`;
  const tagScore = post.tags.length > 0 ? sql`cardinality(ARRAY(SELECT unnest(${blogPosts.tags}) INTERSECT SELECT unnest(${tagArray})))` : sql`0`;
  const categoryScore = post.categoryId ? sql`(CASE WHEN ${blogPosts.categoryId} = ${post.categoryId} THEN 2 ELSE 0 END)` : sql`0`;

  const rows = await db
    .select(cardColumns)
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
    .where(and(liveWhere(), ne(blogPosts.id, post.id)))
    .orderBy(desc(sql`${categoryScore} + ${tagScore}`), desc(blogPosts.publishedAt))
    .limit(limit);
  return rows.map(toCard);
}

/** «آخرین مقالات»: newest live posts, optionally excluding the one being read. */
export async function getLatestPosts(limit = 5, excludeId?: string): Promise<BlogCard[]> {
  const where = excludeId ? and(liveWhere(), ne(blogPosts.id, excludeId)) : liveWhere();
  const rows = await db
    .select(cardColumns)
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
    .where(where)
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
    .limit(limit);
  return rows.map(toCard);
}

/** Sitemap / feed / llms.txt. */
export async function getBlogIndexEntries(limit = 1000) {
  const rows = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      coverImageUrl: blogPosts.coverImageUrl,
      publishedAt: blogPosts.publishedAt,
      updatedAt: blogPosts.updatedAt,
      categoryName: blogCategories.name,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
    .where(liveWhere())
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, publishedAt: row.publishedAt ?? row.updatedAt }));
}

export async function getBlogCategorySlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  const rows = await listBlogCategories();
  if (rows.length === 0) return [];
  const full = await db
    .select({ slug: blogCategories.slug, updatedAt: blogCategories.updatedAt })
    .from(blogCategories)
    .where(inArray(blogCategories.id, rows.map((row) => row.id)));
  return full;
}

export type PublicBlogComment = { id: string; authorName: string; body: string; createdAt: Date };

/** Approved comments, oldest first. Only the author's first name is exposed. */
export async function getApprovedComments(postId: string): Promise<PublicBlogComment[]> {
  const rows = await db
    .select({ id: blogComments.id, body: blogComments.body, createdAt: blogComments.createdAt, fullName: users.fullName })
    .from(blogComments)
    .innerJoin(users, eq(users.id, blogComments.userId))
    .where(and(eq(blogComments.postId, postId), eq(blogComments.status, "approved")))
    .orderBy(asc(blogComments.createdAt))
    .limit(200);
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    authorName: row.fullName?.trim().split(/\s+/)[0] || "کاربر ترندز",
  }));
}
