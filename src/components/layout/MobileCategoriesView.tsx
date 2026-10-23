"use client";

import { MobileSearch } from "@/components/search/MobileSearch";
import { MobileCategoryMenu } from "@/components/layout/MobileCategoryMenu";
import type { NavCategory } from "@/domains/categories/tree";

/**
 * Body of the mobile categories tab: a search box pinned to the top that
 * searches products, brands and categories (live results replace the list
 * while typing), and under it the category accordion with the brands and
 * magazine links. The input stays pinned so the results can scroll beneath it.
 */
export function MobileCategoriesView({ categories }: { categories: NavCategory[] }) {
  return (
    <MobileSearch
      inputId="categories-search"
      formClassName="sticky top-0 z-20 -mx-[var(--gutter)] bg-bg px-[var(--gutter)] pt-[calc(12px+env(safe-area-inset-top,0px))] pb-3"
      idleContent={<MobileCategoryMenu categories={categories} onNavigate={() => undefined} />}
    />
  );
}
