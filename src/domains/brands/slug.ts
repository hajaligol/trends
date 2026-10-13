import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { brands } from "@/lib/db/schema";
import { pickAvailableSlug, slugifyTitle } from "@/domains/catalog/slug";

const FALLBACK_SLUG = "brand";

/**
 * A free slug for a new brand. Prefers the Latin name (`Nike` → `nike`,
 * a shorter and more stable URL) and falls back to the Persian name.
 * `-2`, `-3`… is appended on a clash. The unique index on `brands.slug` is
 * still the real guarantee; the action also catches the race (see
 * `isUniqueViolation`).
 */
export async function generateBrandSlug(name: string, nameEn: string | null): Promise<string> {
  const base = (nameEn ? slugifyTitle(nameEn) : "") || slugifyTitle(name) || FALLBACK_SLUG;
  return pickAvailableSlug(base, async (candidate) => {
    const [row] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.slug, candidate))
      .limit(1);
    return Boolean(row);
  });
}
