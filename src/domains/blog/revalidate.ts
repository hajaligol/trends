import { revalidatePath } from "next/cache";
import { BLOG_BASE } from "@/domains/blog/paths";

/**
 * Refreshes every public surface that lists or renders T-Mag content. Cache
 * keys are request paths, which for a Persian slug are percent-encoded, so
 * both spellings are revalidated (a no-op for the one that isn't cached).
 */
export function revalidateBlogSurfaces(slug?: string): void {
  revalidatePath(BLOG_BASE);
  revalidatePath(`${BLOG_BASE}/category/[slug]`, "page");
  revalidatePath(`${BLOG_BASE}/feed.xml`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
  revalidatePath("/admin/tmag");
  if (slug) {
    revalidatePath(`${BLOG_BASE}/${slug}`);
    const encoded = encodeURIComponent(slug);
    if (encoded !== slug) revalidatePath(`${BLOG_BASE}/${encoded}`);
  }
}
