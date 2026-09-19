import Link from "next/link";
import { SWATCH_BG_CLASS, swatchForCategorySlug } from "@/domains/catalog/presentation";
import type { CatalogCategoryDetail } from "@/domains/catalog/queries";

/**
 * Navigation down (or across) the category tree, shown under the page
 * title on every category page:
 *
 * - **Audience page** (مردانه): the four groups as pastel tiles.
 * - **Group page** (لباس مردانه): every type in the group as pills.
 * - **Type page** (پیراهن مردانه): the group's other types as pills, the
 *   current one highlighted, so a shopper can hop sideways without
 *   going back up.
 *
 * All plain server-rendered links — real, crawlable URLs.
 */
export function SubcategoryNav({ category }: { category: CatalogCategoryDetail }) {
  if (category.children.length > 0 && category.depth === 1) {
    return (
      <nav aria-label="دسته‌های زیرمجموعه" className="mb-7">
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
          {category.children.map((child, index) => (
            <li key={child.id}>
              <Link
                href={`/category/${child.slug}`}
                className={`flex min-h-[84px] items-center justify-center rounded-[22px] px-4 py-5 text-center text-[0.98rem] font-semibold text-ink transition-transform duration-200 hover:-translate-y-[3px] ${
                  SWATCH_BG_CLASS[swatchForCategorySlug(child.slug, index)]
                }`}
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  const isChildren = category.children.length > 0;
  const items = isChildren ? category.children : category.siblings;
  // A lone type with no siblings has nowhere to hop to.
  if (items.length < 2 && !isChildren) return null;
  if (items.length === 0) return null;

  return (
    <nav aria-label={isChildren ? "دسته‌های زیرمجموعه" : "دسته‌های مرتبط"} className="mb-7">
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {items.map((item) => {
          const isCurrent = item.id === category.id;
          return (
            <li key={item.id}>
              <Link
                href={`/category/${item.slug}`}
                aria-current={isCurrent ? "page" : undefined}
                className={`block rounded-full border px-3.5 py-1.5 text-[0.85rem] ${
                  isCurrent ? "border-ink bg-ink text-white" : "border-line text-text-secondary hover:border-ink hover:text-ink"
                }`}
              >
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
