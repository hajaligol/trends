import { revalidatePath } from "next/cache";

/**
 * Revalidates a product page. The cache key is the request path, which for
 * a Persian slug is the percent-encoded form, so both spellings are
 * revalidated — a no-op for the one that isn't cached.
 */
export function revalidateProductPage(slug: string): void {
  revalidatePath(`/product/${slug}`);
  const encoded = encodeURIComponent(slug);
  if (encoded !== slug) revalidatePath(`/product/${encoded}`);
}
