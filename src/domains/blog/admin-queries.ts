import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { blogCategories, blogComments, blogPosts, users } from "@/lib/db/schema";
import type { BlogComment, BlogPost } from "@/lib/db/schema";

/** Admin reads: all statuses. Authorization is the caller's job (same split as the other admin-queries modules). */

export type AdminBlogPostRow = Pick<BlogPost, "id" | "slug" | "title" | "status" | "publishedAt" | "updatedAt" | "authorName"> & {
  categoryName: string | null;
  commentCount: number;
};

export async function listBlogPostsForAdmin({
  status,
  q,
  page = 1,
  pageSize = 20,
}: { status?: BlogPost["status"]; q?: string; page?: number; pageSize?: number } = {}) {
  const safePage = Math.max(1, page);
  const term = q?.trim().slice(0, 100);
  const conditions = [
    status ? eq(blogPosts.status, status) : undefined,
    term ? or(ilike(blogPosts.title, `%${term.replace(/[%_\\]/g, "\\$&")}%`)) : undefined,
  ].filter((condition) => condition !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        status: blogPosts.status,
        publishedAt: blogPosts.publishedAt,
        updatedAt: blogPosts.updatedAt,
        authorName: blogPosts.authorName,
        categoryName: blogCategories.name,
        commentCount: count(blogComments.id),
      })
      .from(blogPosts)
      .leftJoin(blogCategories, eq(blogCategories.id, blogPosts.categoryId))
      .leftJoin(blogComments, eq(blogComments.postId, blogPosts.id))
      .where(where)
      .groupBy(blogPosts.id, blogCategories.name)
      .orderBy(desc(blogPosts.updatedAt))
      .limit(pageSize)
      .offset((safePage - 1) * pageSize),
    db.select({ total: count() }).from(blogPosts).where(where),
  ]);

  return { rows: rows as AdminBlogPostRow[], page: safePage, pageSize, total: totalRows[0]?.total ?? 0, now: Date.now() };
}

export async function getBlogPostForAdmin(id: string): Promise<BlogPost | null> {
  const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return row ?? null;
}

export async function isBlogSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return Boolean(row && row.id !== exceptId);
}

export type AdminBlogCategoryRow = { id: string; slug: string; name: string; description: string | null; displayOrder: number; isActive: boolean; postCount: number };

export async function listBlogCategoriesForAdmin(): Promise<AdminBlogCategoryRow[]> {
  return db
    .select({
      id: blogCategories.id,
      slug: blogCategories.slug,
      name: blogCategories.name,
      description: blogCategories.description,
      displayOrder: blogCategories.displayOrder,
      isActive: blogCategories.isActive,
      postCount: count(blogPosts.id),
    })
    .from(blogCategories)
    .leftJoin(blogPosts, eq(blogPosts.categoryId, blogCategories.id))
    .groupBy(blogCategories.id)
    .orderBy(blogCategories.displayOrder, blogCategories.name);
}

export async function isBlogCategorySlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db.select({ id: blogCategories.id }).from(blogCategories).where(eq(blogCategories.slug, slug)).limit(1);
  return Boolean(row && row.id !== exceptId);
}

export async function countPendingBlogComments(): Promise<number> {
  const [row] = await db.select({ total: count() }).from(blogComments).where(eq(blogComments.status, "pending"));
  return row?.total ?? 0;
}

export type AdminBlogCommentRow = BlogComment & { postTitle: string; postSlug: string; authorName: string | null; authorMobile: string };

export async function listBlogCommentsForAdmin({ status, page = 1, pageSize = 20 }: { status?: BlogComment["status"]; page?: number; pageSize?: number } = {}) {
  const safePage = Math.max(1, page);
  const where = status ? eq(blogComments.status, status) : undefined;
  const [rows, totalRows] = await Promise.all([
    db
      .select({ comment: blogComments, postTitle: blogPosts.title, postSlug: blogPosts.slug, authorName: users.fullName, authorMobile: users.mobile })
      .from(blogComments)
      .innerJoin(blogPosts, eq(blogPosts.id, blogComments.postId))
      .innerJoin(users, eq(users.id, blogComments.userId))
      .where(where)
      .orderBy(desc(blogComments.createdAt))
      .limit(pageSize)
      .offset((safePage - 1) * pageSize),
    db.select({ total: count() }).from(blogComments).where(where),
  ]);
  return {
    rows: rows.map((row) => ({ ...row.comment, postTitle: row.postTitle, postSlug: row.postSlug, authorName: row.authorName, authorMobile: row.authorMobile })) as AdminBlogCommentRow[],
    page: safePage,
    pageSize,
    total: totalRows[0]?.total ?? 0,
  };
}
