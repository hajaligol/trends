import { BlogAdminTabs } from "@/components/admin/blog/BlogAdminTabs";
import { BlogCategoryForm, BlogCategoryTable } from "@/components/admin/blog/BlogCategoryManager";
import { Card, PageHeader } from "@/components/admin/ui/layout";
import { countPendingBlogComments, listBlogCategoriesForAdmin } from "@/domains/blog/admin-queries";

export const metadata = { title: "دسته‌های تی‌مگ", robots: { index: false, follow: false } };

export default async function AdminBlogCategoriesPage() {
  const [categories, pendingComments] = await Promise.all([listBlogCategoriesForAdmin(), countPendingBlogComments()]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="دسته‌های تی‌مگ" description="موضوع‌های مجله (مثلاً «راهنمای سایز» یا «ست لباس»). جدا از دسته‌بندی محصولات فروشگاه است." />
      <BlogAdminTabs active="categories" pendingComments={pendingComments} />
      <BlogCategoryTable categories={categories} />
      <Card title="افزودن دسته">
        <BlogCategoryForm />
      </Card>
    </div>
  );
}
