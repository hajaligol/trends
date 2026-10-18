import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { blogCategories, blogPosts } from "@/lib/db/schema";
import { pickAvailableSlug, slugifyTitle } from "@/domains/catalog/slug";

/** A free slug for a new article, derived from its title (`-2`, `-3`… on a clash; the unique index is the real guard). */
export async function generateBlogPostSlug(title: string): Promise<string> {
  const base = slugifyTitle(title) || "article";
  return pickAvailableSlug(base, async (candidate) => {
    const [row] = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, candidate)).limit(1);
    return Boolean(row);
  });
}

export async function generateBlogCategorySlug(name: string): Promise<string> {
  const base = slugifyTitle(name) || "category";
  return pickAvailableSlug(base, async (candidate) => {
    const [row] = await db.select({ id: blogCategories.id }).from(blogCategories).where(eq(blogCategories.slug, candidate)).limit(1);
    return Boolean(row);
  });
}
