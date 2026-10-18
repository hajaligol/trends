import { getBlogIndexEntries } from "@/domains/blog/queries";
import { BLOG_BASE, BLOG_DESCRIPTION, BLOG_TITLE, blogPostHref } from "@/domains/blog/paths";
import { xmlEscape } from "@/domains/blog/xml";
import { SITE_URL } from "@/lib/site-config";

// RSS 2.0 feed of the newest articles. Revalidated by admin publishes; the timer is the fallback.
export const revalidate = 600;

export async function GET() {
  const entries = await getBlogIndexEntries(30);
  const items = entries
    .map((entry) => {
      const link = `${SITE_URL}${blogPostHref(entry.slug)}`;
      return [
        "    <item>",
        `      <title>${xmlEscape(entry.title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `      <pubDate>${entry.publishedAt.toUTCString()}</pubDate>`,
        entry.categoryName ? `      <category>${xmlEscape(entry.categoryName)}</category>` : null,
        `      <description>${xmlEscape(entry.excerpt)}</description>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(BLOG_TITLE)}</title>
    <link>${xmlEscape(`${SITE_URL}${BLOG_BASE}`)}</link>
    <description>${xmlEscape(BLOG_DESCRIPTION)}</description>
    <language>fa-IR</language>
    <atom:link href="${xmlEscape(`${SITE_URL}${BLOG_BASE}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
