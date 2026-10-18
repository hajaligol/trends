import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { isLocalAssetPath } from "@/domains/blog/markdown";

/**
 * Renders an article's Markdown (GitHub-flavoured: tables, task lists,
 * strikethrough, autolinks).
 *
 * Safety: `react-markdown` does NOT interpret raw HTML in the source (there is
 * no `rehype-raw` here) and drops unsafe URL schemes such as `javascript:`, so
 * stored text can never inject markup or script. It builds React elements, so
 * no `dangerouslySetInnerHTML` is involved.
 *
 * - Headings get stable ids (`rehype-slug`) that the table of contents links to.
 *   A `#` in the body renders as `h2`: the article page owns the only `h1`.
 * - Images: only uploaded files (`/assets/...`) render, through `next/image`
 *   (lazy, responsive), inside a `<figure>`; the optional Markdown title is
 *   the caption. Other images are dropped (the CSP would block them anyway).
 * - Tables scroll sideways inside their own box instead of widening the page.
 * - External links open safely in a new tab; internal ones use `next/link`.
 *
 * Works on the server and inside the admin's client-side preview.
 */

type Hast = { type?: string; tagName?: string; value?: string; children?: Hast[] };

function isWhitespaceText(node: Hast): boolean {
  return node.type === "text" && !(node.value ?? "").trim();
}

const HEADING_BASE = "scroll-mt-6 font-bold text-ink";

const components: Components = {
  h1: ({ children, id }) => (
    <h2 id={id} className={`${HEADING_BASE} mb-4 mt-10 text-[clamp(1.35rem,2.4vw,1.7rem)]`}>
      {children}
    </h2>
  ),
  h2: ({ children, id }) => (
    <h2 id={id} className={`${HEADING_BASE} mb-4 mt-10 text-[clamp(1.35rem,2.4vw,1.7rem)]`}>
      {children}
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3 id={id} className={`${HEADING_BASE} mb-3 mt-8 text-[clamp(1.1rem,2vw,1.3rem)]`}>
      {children}
    </h3>
  ),
  h4: ({ children, id }) => (
    <h4 id={id} className={`${HEADING_BASE} mb-2 mt-6 text-[1.05rem]`}>
      {children}
    </h4>
  ),
  p: ({ children, node }) => {
    // A paragraph holding only an image becomes a <figure>; nesting that in a
    // <p> would be invalid HTML (and a hydration warning).
    const kids = ((node as Hast | undefined)?.children ?? []).filter((child) => !isWhitespaceText(child));
    if (kids.length === 1 && kids[0]?.tagName === "img") return <>{children}</>;
    return <p className="my-5 text-[1.02rem] leading-9 text-ink/90">{children}</p>;
  },
  a: ({ href, children }) => {
    if (!href) return <>{children}</>;
    const className = "font-semibold text-brand underline underline-offset-4 hover:text-brand-dark";
    if (href.startsWith("/") && !href.startsWith("//")) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    }
    if (href.startsWith("#")) {
      return (
        <a href={href} className={className}>
          {children}
        </a>
      );
    }
    const external = /^https?:\/\//i.test(href);
    return (
      <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  },
  ul: ({ children }) => <ul className="my-5 list-disc space-y-2 ps-6 text-[1.02rem] leading-9 marker:text-brand">{children}</ul>,
  ol: ({ children }) => <ol className="my-5 list-decimal space-y-2 ps-6 text-[1.02rem] leading-9 marker:font-semibold marker:text-brand">{children}</ol>,
  li: ({ children }) => <li className="text-ink/90">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 rounded-[14px] border-s-4 border-brand bg-lavender/40 px-5 py-1 text-ink/90 [&>p]:my-3">{children}</blockquote>
  ),
  hr: () => <hr className="my-10 border-0 border-t border-line" />,
  strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
  code: ({ children, className }) => (
    <code dir="ltr" className={`${className ?? ""} rounded-[6px] bg-ink/6 px-1.5 py-0.5 text-[0.9em]`}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre dir="ltr" className="my-6 overflow-x-auto rounded-[14px] bg-ink p-4 text-[0.85rem] leading-7 text-white [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-7 overflow-x-auto rounded-[14px] border border-line bg-white">
      <table className="w-full min-w-[480px] border-collapse text-[0.92rem]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-header-bg">{children}</thead>,
  th: ({ children, style }) => (
    <th style={style} className="border-b border-line px-4 py-3 text-start font-bold text-ink">
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="border-b border-line px-4 py-3 align-top leading-7 text-ink/90 group-last/row:border-b-0">
      {children}
    </td>
  ),
  tr: ({ children }) => <tr className="group/row">{children}</tr>,
  img: ({ src, alt, title }: ComponentPropsWithoutRef<"img">) => {
    if (!isLocalAssetPath(typeof src === "string" ? src : undefined)) return null;
    return (
      <figure className="my-8">
        <Image
          src={src as string}
          alt={alt ?? ""}
          width={1200}
          height={800}
          sizes="(min-width: 1024px) 760px, 100vw"
          loading="lazy"
          className="h-auto w-full rounded-[22px] bg-card-image"
        />
        {title && <figcaption className="mt-2.5 text-center text-[0.85rem] text-text-secondary">{title}</figcaption>}
      </figure>
    );
  },
};

export function MarkdownContent({ children }: { children: string }): ReactNode {
  return (
    <div className="min-w-0 break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
