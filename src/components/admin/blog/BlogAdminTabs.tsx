import { FilterTabs } from "@/components/admin/ui/layout";

export type BlogAdminSection = "posts" | "categories" | "comments";

/** Section switcher shared by the three T-Mag admin pages. */
export function BlogAdminTabs({ active, pendingComments = 0 }: { active: BlogAdminSection; pendingComments?: number }) {
  return (
    <FilterTabs
      items={[
        { label: "مقاله‌ها", href: "/admin/tmag", active: active === "posts" },
        { label: "دسته‌ها", href: "/admin/tmag/categories", active: active === "categories" },
        { label: "دیدگاه‌ها", href: "/admin/tmag/comments", active: active === "comments", count: pendingComments > 0 ? pendingComments : undefined },
      ]}
    />
  );
}
