import { notFound } from "next/navigation";
import { BlogPostForm } from "@/components/admin/blog/BlogPostForm";
import { PageHeader, StatusBadge } from "@/components/admin/ui/layout";
import { getBlogPostForAdmin, listBlogCategoriesForAdmin } from "@/domains/blog/admin-queries";

export const metadata = { title: "ویرایش مقاله", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [post, categories] = await Promise.all([getBlogPostForAdmin(id), listBlogCategoriesForAdmin()]);
  if (!post) notFound();

  // The current category stays selectable even if it was deactivated since.
  const options = categories.filter((category) => category.isActive || category.id === post.categoryId);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={post.title}
        backHref="/admin/tmag"
        backLabel="همه‌ی مقاله‌ها"
        badge={<StatusBadge tone={post.status === "published" ? "success" : "neutral"}>{post.status === "published" ? "منتشر شده" : "پیش‌نویس"}</StatusBadge>}
      />
      <BlogPostForm post={post} categories={options} />
    </div>
  );
}
