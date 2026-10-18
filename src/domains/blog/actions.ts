"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { blogComments } from "@/lib/db/schema";
import { blogCommentSchema } from "@/lib/validation/blog";
import type { ActionResult } from "@/domains/auth/roles";
import { getLivePostBySlug } from "@/domains/blog/queries";
import { checkIpRateLimit, checkRateLimit } from "@/lib/security/rate-limit";

/**
 * A reader comment on an article. Same trust model as product reviews:
 * signed-in only (every comment is attributed to a real account), stored as
 * `pending` and shown only after staff approve it (`moderateBlogCommentAction`).
 *
 * Abuse controls, all server-side: IP rate limit, per-user rate limit, a
 * ceiling on how many of a user's comments may be waiting for moderation, a
 * duplicate-text check, and plain-text-only validation (no links).
 */

const MAX_PENDING_PER_USER = 5;

export async function submitBlogCommentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const rateLimited = await checkIpRateLimit("blog-comment", 20, 60 * 60 * 1000);
  if (rateLimited) return { ok: false, error: rateLimited.error };

  const session = await auth();
  if (!session?.user) return { ok: false, error: "برای ثبت دیدگاه ابتدا وارد حساب کاربری خود شوید" };

  const userRate = checkRateLimit(`blog-comment-user:${session.user.id}`, 5, 10 * 60 * 1000);
  if (!userRate.allowed) return { ok: false, error: "دیدگاه‌های شما پشت‌سر‌هم ثبت شده است؛ لطفاً کمی بعد دوباره تلاش کنید." };

  const parsed = blogCommentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { ok: false, error: flat.body?.[0] ?? "اطلاعات وارد شده معتبر نیست" };
  }

  // The article is resolved from its public slug on the server; the form never carries an id.
  const post = await getLivePostBySlug(parsed.data.postSlug);
  if (!post) return { ok: false, error: "مقاله یافت نشد" };

  const [{ pending } = { pending: 0 }] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(blogComments)
    .where(and(eq(blogComments.userId, session.user.id), eq(blogComments.status, "pending")));
  if (pending >= MAX_PENDING_PER_USER) {
    return { ok: false, error: "چند دیدگاه شما هنوز در انتظار بررسی است؛ پس از تأیید می‌توانید دیدگاه جدید ثبت کنید." };
  }

  const [duplicate] = await db
    .select({ id: blogComments.id })
    .from(blogComments)
    .where(
      and(
        eq(blogComments.postId, post.id),
        eq(blogComments.userId, session.user.id),
        eq(blogComments.body, parsed.data.body),
        gte(blogComments.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
      ),
    )
    .limit(1);
  if (duplicate) return { ok: false, error: "این دیدگاه را قبلاً ثبت کرده‌اید" };

  try {
    await db.insert(blogComments).values({ postId: post.id, userId: session.user.id, body: parsed.data.body });
  } catch (error) {
    console.error("submitBlogCommentAction failed", error);
    return { ok: false, error: "خطا در ثبت دیدگاه؛ دوباره تلاش کنید" };
  }

  return { ok: true };
}
