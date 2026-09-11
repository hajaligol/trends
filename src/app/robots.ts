import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

/**
 * No admin/account routes exist yet (those are Phase 6/11), so there's
 * nothing to `Disallow` today beyond the search results pages, which are
 * already `noindex`'d per-page in `src/app/search/page.tsx` — `noindex`
 * is the correct tool there (it still lets crawlers follow links through
 * the page), not `Disallow` (which would prevent crawling it at all).
 * Revisit this file once Phase 6 (`/account/*`) and Phase 11 (`/admin/*`)
 * exist, per TRENDS_PROJECT_CONTEXT.md §8 ("no accidental indexing of
 * private/account/admin pages").
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
