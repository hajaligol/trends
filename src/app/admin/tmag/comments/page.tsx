import { BlogAdminTabs } from "@/components/admin/blog/BlogAdminTabs";
import { BlogCommentRow } from "@/components/admin/blog/BlogCommentRow";
import { buildHref, EmptyState, FilterTabs, PageHeader, Pagination } from "@/components/admin/ui/layout";
import { MessageIcon } from "@/components/admin/ui/icons";
import { countPendingBlogComments, listBlogCommentsForAdmin } from "@/domains/blog/admin-queries";
import type { BlogComment } from "@/lib/db/schema";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "دیدگاه‌های تی‌مگ", robots: { index: false, follow: false } };

const FILTERS: { value: BlogComment["status"] | ""; label: string }[] = [
  { value: "pending", label: "در انتظار بررسی" },
  { value: "approved", label: "تأیید شده" },
  { value: "rejected", label: "رد شده" },
  { value: "", label: "همه" },
];

export default async function AdminBlogCommentsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const params = await searchParams;
  const status = FILTERS.find((filter) => filter.value && filter.value === params.status)?.value || undefined;
  const page = Number(params.page ?? "1") || 1;
  const [result, pendingComments] = await Promise.all([listBlogCommentsForAdmin({ status: status as BlogComment["status"] | undefined, page }), countPendingBlogComments()]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="دیدگاه‌های تی‌مگ" description="دیدگاه خوانندگان تا زمانی که تأیید نشود در سایت نمایش داده نمی‌شود." />
      <BlogAdminTabs active="comments" pendingComments={pendingComments} />
      <FilterTabs items={FILTERS.map((filter) => ({ label: filter.label, href: buildHref("/admin/tmag/comments", { status: filter.value || undefined }), active: (status ?? "") === filter.value }))} />

      {result.rows.length === 0 ? (
        <EmptyState icon={<MessageIcon width={26} height={26} />} title={status === "pending" ? "دیدگاهی در انتظار بررسی نیست" : "دیدگاهی یافت نشد"} />
      ) : (
        <>
          <p className="m-0 text-[0.82rem] text-text-secondary">{toPersianDigits(result.total)} دیدگاه</p>
          <div className="flex flex-col gap-4">
            {result.rows.map((comment) => (
              <BlogCommentRow key={comment.id} comment={comment} />
            ))}
          </div>
        </>
      )}
      <Pagination pathname="/admin/tmag/comments" params={{ status }} page={page} totalPages={totalPages} total={result.total} pageSize={result.pageSize} />
    </div>
  );
}
