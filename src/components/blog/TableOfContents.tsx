import { numberHeadings, type TocHeading } from "@/domains/blog/markdown";
import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * «فهرست مطالب»: in-page links to the article's h2/h3 headings (ids come from
 * the same slugger the renderer uses). Plain anchor links, so it works
 * without JS and gives search engines jump-to links. `bare` drops the card
 * chrome (used inside the mobile disclosure).
 */
export function TableOfContents({ headings, bare = false }: { headings: TocHeading[]; bare?: boolean }) {
  if (headings.length < 2) return null;

  const list = (
    <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
      {numberHeadings(headings).map((heading) => (
        <li key={heading.id} className={heading.level === 3 ? "ps-5" : undefined}>
          <a
            href={`#${heading.id}`}
            className="flex gap-2 rounded-[8px] px-2 py-1.5 text-[0.88rem] leading-7 text-text-secondary transition-colors hover:bg-ink/5 hover:text-ink"
          >
            {heading.level === 2 && <span aria-hidden="true" className="font-semibold text-brand">{toPersianDigits(heading.number)}.</span>}
            <span>{heading.text}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  if (bare) return list;
  return (
    <nav aria-labelledby="toc-title" className="rounded-[22px] border border-line bg-white p-5">
      <h2 id="toc-title" className="m-0 mb-3 text-[1rem] font-bold text-ink">
        فهرست مطالب
      </h2>
      {list}
    </nav>
  );
}
