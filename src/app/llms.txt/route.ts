import { getBlogIndexEntries } from "@/domains/blog/queries";
import { BLOG_BASE, BLOG_DESCRIPTION, BLOG_TITLE, blogPostHref } from "@/domains/blog/paths";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

// A plain-Markdown map of the site for AI answer engines (the emerging /llms.txt convention):
// who we are, the pages worth reading, and every article with a one-line summary.
export const revalidate = 600;

export async function GET() {
  const entries = await getBlogIndexEntries(200);

  const lines = [
    `# ${SITE_NAME} (Trends)`,
    "",
    `> ${SITE_NAME} یک فروشگاه آنلاین پوشاک ایرانی است (زبان: فارسی، واحد قیمت: تومان). ${BLOG_DESCRIPTION}`,
    "",
    "## فروشگاه",
    `- [برندها](${SITE_URL}/brands): فهرست برندهای موجود در فروشگاه`,
    `- [پرسش‌های متداول](${SITE_URL}/faq): ارسال، پرداخت، سایز و مرجوعی`,
    `- [راهنمای ارسال](${SITE_URL}/shipping-policy)`,
    `- [شرایط بازگشت کالا](${SITE_URL}/returns-policy)`,
    `- [درباره ما](${SITE_URL}/about)`,
    "",
    `## ${BLOG_TITLE}`,
    `- [همه‌ی مقالات](${SITE_URL}${BLOG_BASE}): صفحه‌ی اصلی مجله`,
    `- [فید RSS](${SITE_URL}${BLOG_BASE}/feed.xml)`,
    "",
    "## مقالات",
    ...entries.map((entry) => `- [${entry.title}](${SITE_URL}${blogPostHref(entry.slug)}): ${entry.excerpt.replace(/\s+/g, " ").trim()}`),
    "",
  ];

  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
