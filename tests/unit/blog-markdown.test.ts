import { describe, expect, it } from "vitest";
import { countWords, extractHeadings, isLocalAssetPath, numberHeadings, readingMinutes, stripInlineMarkdown } from "@/domains/blog/markdown";
import { blogCommentSchema, blogPostSchema } from "@/lib/validation/blog";
import { xmlEscape } from "@/domains/blog/xml";

describe("extractHeadings", () => {
  it("lists h2/h3 with stable ids and skips code fences", () => {
    const md = "# عنوان کل\n\n## بخش اول\n\ntext\n\n```\n## not a heading\n```\n\n### زیر **بخش**\n\n#### h4 ignored\n\n## بخش اول";
    const headings = extractHeadings(md);
    expect(headings.map((h) => [h.level, h.text])).toEqual([
      [2, "عنوان کل"],
      [2, "بخش اول"],
      [3, "زیر بخش"],
      [2, "بخش اول"],
    ]);
    // duplicates get a suffix, exactly as rehype-slug does
    expect(headings[3]!.id).toBe(`${headings[1]!.id}-1`);
  });

  it("numbers by h2", () => {
    const numbered = numberHeadings(extractHeadings("## a\n### b\n## c"));
    expect(numbered.map((h) => h.number)).toEqual([1, 1, 2]);
  });
});

describe("helpers", () => {
  it("strips inline markdown", () => {
    expect(stripInlineMarkdown("[لینک](/x) و `کد` و *مورب*")).toBe("لینک و کد و مورب");
  });
  it("counts words and reading time (min 1)", () => {
    expect(countWords("یک دو | سه")).toBe(3);
    expect(readingMinutes("کوتاه")).toBe(1);
    expect(readingMinutes("کلمه ".repeat(400))).toBe(3);
  });
  it("accepts only uploaded local images", () => {
    expect(isLocalAssetPath("/assets/blog/a.webp")).toBe(true);
    expect(isLocalAssetPath("https://evil.example/a.png")).toBe(false);
    expect(isLocalAssetPath("/assets/../etc/passwd")).toBe(false);
    expect(isLocalAssetPath("//evil.example/a.png")).toBe(false);
  });
  it("escapes XML", () => {
    expect(xmlEscape(`a & <b> "c"`)).toBe("a &amp; &lt;b&gt; &quot;c&quot;");
  });
});

describe("blog validation", () => {
  const base = { title: "عنوان مقاله", excerpt: "خلاصه‌ی کافی برای مقاله", content: "متن کافی برای این مقاله هست.", authorName: "تحریریه", status: "published" };
  it("parses lists, tags and faq; drops half-filled faq rows", () => {
    const parsed = blogPostSchema.parse({ ...base, tags: "الف، ب، الف", keyTakeaways: "یک\n\n دو ", faq: JSON.stringify([{ question: "؟", answer: "پاسخ" }, { question: "x", answer: "" }]) });
    expect(parsed.tags).toEqual(["الف", "ب"]);
    expect(parsed.keyTakeaways).toEqual(["یک", "دو"]);
    expect(parsed.faq).toHaveLength(1);
  });
  it("requires alt text for a cover image and rejects remote covers", () => {
    expect(blogPostSchema.safeParse({ ...base, coverImageUrl: "/assets/blog/a.jpg" }).success).toBe(false);
    expect(blogPostSchema.safeParse({ ...base, coverImageUrl: "https://x.y/a.jpg", coverImageAlt: "alt" }).success).toBe(false);
    expect(blogPostSchema.safeParse({ ...base, coverImageUrl: "/assets/blog/a.jpg", coverImageAlt: "alt" }).success).toBe(true);
  });
  it("converts the Tehran publish time", () => {
    const parsed = blogPostSchema.parse({ ...base, publishedAt: "2026-10-16T10:00" });
    expect(parsed.publishedAt?.toISOString()).toBe("2026-10-16T06:30:00.000Z");
  });
  it("rejects links and empty comments", () => {
    expect(blogCommentSchema.safeParse({ postSlug: "a", body: "ببینید https://spam.example" }).success).toBe(false);
    expect(blogCommentSchema.safeParse({ postSlug: "a", body: " " }).success).toBe(false);
    expect(blogCommentSchema.safeParse({ postSlug: "a", body: "مقاله‌ی خوبی بود" }).success).toBe(true);
  });
});
