import { eq } from "drizzle-orm";
import { db, type DbTransaction } from "@/lib/db/client";
import { campaigns } from "@/lib/db/schema";
import { pickAvailableSlug, slugifyTitle } from "@/domains/catalog/slug";

/** `/sale/<slug>` — the public products page of a campaign. */
export function campaignHref(slug: string): string {
  return `/sale/${encodeURIComponent(slug)}`;
}

/**
 * A unique slug from the campaign name («حراج پاییزه» → `حراج-پاییزه`,
 * then `-2`, `-3`… on a clash). Persian slugs are fine: product URLs already
 * work the same way. The unique index is the real guarantee — this only
 * picks a free candidate.
 */
export async function generateCampaignSlug(executor: typeof db | DbTransaction, name: string): Promise<string> {
  const base = slugifyTitle(name) || "sale";
  return pickAvailableSlug(base, async (candidate) => {
    const [row] = await executor.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.slug, candidate)).limit(1);
    return Boolean(row);
  });
}
