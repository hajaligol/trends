"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { blogCategories, blogComments, blogPosts } from "@/lib/db/schema";
import { blogCategorySchema, blogCommentModerationSchema, blogPostSchema } from "@/lib/validation/blog";
import { isStaffOrAdmin, UNAUTHORIZED_ERROR, type ActionResult } from "@/domains/auth/roles";
import { recordAuditLog } from "@/domains/analytics/audit";
import { generateBlogCategorySlug, generateBlogPostSlug } from "@/domains/blog/slug";
import { isBlogCategorySlugTaken, isBlogSlugTaken } from "@/domains/blog/admin-queries";
import { revalidateBlogSurfaces } from "@/domains/blog/revalidate";

/**
 * Admin T-Mag mutations. Like every admin action, each one re-checks the
 * session role itself and validates its input on the server; the `/admin`
 * layout gate and the form's own constraints are never trusted.
 */

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const flat = error.flatten();
  const firstField = Object.values(flat.fieldErrors).find((messages) => messages && messages.length > 0);
  return firstField?.[0] ?? "اطلاعات وارد شده معتبر نیست";
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const causeCode = (error as { cause?: { code?: string } } | null)?.cause?.code;
  return code === "23505" || causeCode === "23505";
}

const SLUG_TAKEN = "این نامک قبلاً استفاده شده است";

/** Fields from the parsed form → the row's columns. The publish date is decided here, never by the client alone. */
function postColumns(data: ReturnType<typeof blogPostSchema.parse>, existingPublishedAt: Date | null) {
  const { slug: _slug, publishedAt, ...fields } = data;
  void _slug;
  // Published posts always carry a date (DB check): the typed one, else the
  // existing one (re-publishing keeps the original date), else now.
  const resolvedPublishedAt = data.status === "published" ? (publishedAt ?? existingPublishedAt ?? new Date()) : (publishedAt ?? existingPublishedAt);
  return { ...fields, publishedAt: resolvedPublishedAt };
}

export async function createBlogPostAction(_prev: ActionResult<{ id: string }>, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = blogPostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  try {
    const slug = parsed.data.slug && !(await isBlogSlugTaken(parsed.data.slug)) ? parsed.data.slug : await generateBlogPostSlug(parsed.data.title);
    const [created] = await db
      .insert(blogPosts)
      .values({ ...postColumns(parsed.data, null), slug })
      .returning({ id: blogPosts.id, slug: blogPosts.slug });
    if (!created) return { ok: false, error: "خطا در ثبت مقاله؛ دوباره تلاش کنید" };

    await recordAuditLog(session.user, "blog_post.create", "blog_post", created.id, { title: parsed.data.title, status: parsed.data.status });
    revalidateBlogSurfaces(created.slug);
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: SLUG_TAKEN };
    console.error("createBlogPostAction failed", error);
    return { ok: false, error: "خطا در ثبت مقاله؛ دوباره تلاش کنید" };
  }
}

export async function updateBlogPostAction(_prev: ActionResult<{ id: string }>, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "مقاله یافت نشد" };

  const parsed = blogPostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  const [existing] = await db.select({ slug: blogPosts.slug, publishedAt: blogPosts.publishedAt }).from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  if (!existing) return { ok: false, error: "مقاله یافت نشد" };

  // Blank slug keeps the current one: a published URL should not move by accident.
  const slug = parsed.data.slug ?? existing.slug;
  if (await isBlogSlugTaken(slug, id)) return { ok: false, error: SLUG_TAKEN };

  try {
    await db
      .update(blogPosts)
      .set({ ...postColumns(parsed.data, existing.publishedAt), slug, updatedAt: new Date() })
      .where(eq(blogPosts.id, id));
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: SLUG_TAKEN };
    console.error("updateBlogPostAction failed", error);
    return { ok: false, error: "خطا در ذخیره مقاله؛ دوباره تلاش کنید" };
  }

  await recordAuditLog(session.user, "blog_post.update", "blog_post", id, { title: parsed.data.title, status: parsed.data.status, slug });
  revalidateBlogSurfaces(slug);
  if (slug !== existing.slug) revalidateBlogSurfaces(existing.slug);
  return { ok: true, data: { id } };
}

export async function deleteBlogPostAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const deleted = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning({ slug: blogPosts.slug, title: blogPosts.title });
  const row = deleted[0];
  if (!row) return { ok: false, error: "مقاله یافت نشد" };

  await recordAuditLog(session.user, "blog_post.delete", "blog_post", id, { title: row.title });
  revalidateBlogSurfaces(row.slug);
  return { ok: true };
}

/* ------------------------------ categories ------------------------------ */

export async function createBlogCategoryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = blogCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error) };

  try {
    const { slug: requested, ...fields } = parsed.data;
    const slug = requested && !(await isBlogCategorySlugTaken(requested)) ? requested : await generateBlogCategorySlug(fields.name);
    const [created] = await db.insert(blogCategories).values({ ...fields, slug }).returning({ id: blogCategories.id });
    await recordAuditLog(session.user, "blog_category.create", "blog_category", created?.id ?? null, { name: fields.name, slug });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: SLUG_TAKEN };
    console.error("createBlogCategoryAction failed", error);
    return { ok: false, error: "خطا در ثبت دسته؛ دوباره تلاش کنید" };
  }

  revalidateBlogSurfaces();
  return { ok: true };
}

export async function updateBlogCategoryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const id = String(formData.get("id") ?? "");
  const parsed = blogCategorySchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) return { ok: false, error: parsed.success ? "دسته یافت نشد" : fieldErrors(parsed.error) };

  const [existing] = await db.select({ slug: blogCategories.slug }).from(blogCategories).where(eq(blogCategories.id, id)).limit(1);
  if (!existing) return { ok: false, error: "دسته یافت نشد" };

  const slug = parsed.data.slug ?? existing.slug;
  if (await isBlogCategorySlugTaken(slug, id)) return { ok: false, error: SLUG_TAKEN };

  try {
    await db.update(blogCategories).set({ ...parsed.data, slug, updatedAt: new Date() }).where(eq(blogCategories.id, id));
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: SLUG_TAKEN };
    console.error("updateBlogCategoryAction failed", error);
    return { ok: false, error: "خطا در ذخیره دسته؛ دوباره تلاش کنید" };
  }

  await recordAuditLog(session.user, "blog_category.update", "blog_category", id, { name: parsed.data.name, slug });
  revalidateBlogSurfaces();
  return { ok: true };
}

/** Posts keep existing: the FK is `ON DELETE SET NULL`, so they just become uncategorised. */
export async function deleteBlogCategoryAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const deleted = await db.delete(blogCategories).where(eq(blogCategories.id, id)).returning({ name: blogCategories.name });
  if (!deleted[0]) return { ok: false, error: "دسته یافت نشد" };

  await recordAuditLog(session.user, "blog_category.delete", "blog_category", id, { name: deleted[0].name });
  revalidateBlogSurfaces();
  return { ok: true };
}

/* ------------------------------- comments ------------------------------- */

export async function moderateBlogCommentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = blogCommentModerationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "اطلاعات وارد شده معتبر نیست" };

  const updated = await db
    .update(blogComments)
    .set({ status: parsed.data.status, moderatedByUserId: session.user.id, moderatedAt: new Date() })
    .where(eq(blogComments.id, parsed.data.commentId))
    .returning({ postId: blogComments.postId });
  if (!updated[0]) return { ok: false, error: "دیدگاه یافت نشد" };

  const [post] = await db.select({ slug: blogPosts.slug }).from(blogPosts).where(eq(blogPosts.id, updated[0].postId)).limit(1);
  await recordAuditLog(session.user, `blog_comment.${parsed.data.status}`, "blog_comment", parsed.data.commentId);
  revalidatePath("/admin/tmag/comments");
  revalidateBlogSurfaces(post?.slug);
  return { ok: true };
}

export async function deleteBlogCommentAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !isStaffOrAdmin(session.user.role)) return { ok: false, error: UNAUTHORIZED_ERROR };

  const deleted = await db.delete(blogComments).where(eq(blogComments.id, id)).returning({ postId: blogComments.postId });
  if (!deleted[0]) return { ok: false, error: "دیدگاه یافت نشد" };

  const [post] = await db.select({ slug: blogPosts.slug }).from(blogPosts).where(eq(blogPosts.id, deleted[0].postId)).limit(1);
  await recordAuditLog(session.user, "blog_comment.delete", "blog_comment", id);
  revalidatePath("/admin/tmag/comments");
  revalidateBlogSurfaces(post?.slug);
  return { ok: true };
}
