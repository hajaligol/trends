import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

/**
 * A plain "/" separator is used rather than a directional arrow (←/→):
 * this list already reads correctly in both LTR and RTL just from
 * document order + the `dir="rtl"` on `<html>`, so a non-directional
 * separator avoids any ambiguity a chevron could introduce.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="مسیر صفحه" className="mb-5 text-[0.85rem] text-text-secondary">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-ink">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-ink" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
