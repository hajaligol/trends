import GithubSlugger from "github-slugger";

/**
 * Pure Markdown helpers for T-Mag articles (no DB, no React), shared by the
 * article page, the admin preview and the unit tests.
 *
 * The table of contents must point at the same `id`s the renderer puts on the
 * headings. The renderer uses `rehype-slug`, which slugs with
 * `github-slugger`; this file uses the same library on the heading text with
 * inline Markdown stripped, so the ids match by construction.
 */

export type TocHeading = { id: string; text: string; level: 2 | 3 };

/** Removes inline Markdown from a heading so it matches the rendered text. */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+#+\s*$/, "")
    .trim();
}

/**
 * h2/h3 headings of a Markdown document, in order, with their anchor ids.
 * Headings inside fenced code blocks are ignored. A level-1 heading in the
 * body is rendered as h2 (the page already has its own h1) and listed as h2.
 * Every heading (any level) advances the slugger, because the renderer
 * assigns ids to all of them and duplicates get `-1`, `-2`… suffixes.
 */
export function extractHeadings(markdown: string): TocHeading[] {
  const slugger = new GithubSlugger();
  const headings: TocHeading[] = [];
  let fence: string | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1]!;
      if (fence === null) fence = marker[0]!;
      else if (marker[0] === fence) fence = null;
      continue;
    }
    if (fence) continue;

    const match = /^\s{0,3}(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const level = match[1]!.length;
    const text = stripInlineMarkdown(match[2]!);
    if (!text) continue;
    const id = slugger.slug(text);
    if (level <= 3) headings.push({ id, text, level: level === 3 ? 3 : 2 });
  }
  return headings;
}

/** Visible words of a Markdown document (code fences, URLs and markup removed). */
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[|#>*_`~\-]+/g, " ");
  const words = text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word));
  return words.length;
}

/** Reading time in whole minutes at ~180 words/minute (Persian), at least 1. */
export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.ceil(countWords(markdown) / 180));
}

/**
 * Only images we host (`/assets/...`) are rendered inside articles: the site's
 * CSP (`img-src 'self' data:`) and `next/image` (no remote hosts) would block
 * anything else, so the renderer drops other images rather than ship a broken
 * one. Mirrors the admin validation for uploaded paths.
 */
export function isLocalAssetPath(src: string | undefined | null): src is string {
  return typeof src === "string" && /^\/assets\/[A-Za-z0-9._\-/]+$/.test(src) && !src.includes("..");
}

/** Adds the running h2 number (1, 2, 3…) to each heading; h3 items carry their parent's number. */
export function numberHeadings(headings: TocHeading[]): (TocHeading & { number: number })[] {
  return headings.map((heading, index) => ({
    ...heading,
    number: headings.slice(0, index + 1).filter((item) => item.level === 2).length,
  }));
}
