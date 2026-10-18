import { BlogPostForm } from "@/components/admin/blog/BlogPostForm";
import { PageHeader } from "@/components/admin/ui/layout";
import { listBlogCategoriesForAdmin } from "@/domains/blog/admin-queries";

export const metadata = { title: "مقاله‌ی جدید", robots: { index: false, follow: false } };

export default async function NewBlogPostPage() {
  const categories = await listBlogCategoriesForAdmin();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="مقاله‌ی جدید" backHref="/admin/tmag" backLabel="همه‌ی مقاله‌ها" />
      <BlogPostForm categories={categories.filter((category) => category.isActive)} />
    </div>
  );
}
