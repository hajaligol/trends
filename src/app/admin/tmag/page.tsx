import Link from "next/link";
import { BlogAdminTabs } from "@/components/admin/blog/BlogAdminTabs";
import { adminButton, buildHref, EmptyState, FilterBar, FilterTabs, formatDate, PageHeader, Pagination, SearchField, StatusBadge, TABLE, TD, TD_MUTED, TH, THEAD, TR, TableCard } from "@/components/admin/ui/layout";
import { NewspaperIcon, PlusIcon } from "@/components/admin/ui/icons";
import { countPendingBlogComments, listBlogPostsForAdmin } from "@/domains/blog/admin-queries";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export const metadata = { title: "تی‌مگ", robots: { index: false, follow: false } };

const STATUS_TABS = [
  { value: "", label: "همه" },
  { value: "published", label: "منتشر شده" },
  { value: "draft", label: "پیش‌نویس" },
] as const;

export default async function AdminBlogPostsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const params = await searchParams;
  const status = params.status === "published" || params.status === "draft" ? params.status : undefined;
  const page = Number(params.page ?? "1") || 1;
  const [result, pendingComments] = await Promise.all([listBlogPostsForAdmin({ status, q: params.q, page }), countPendingBlogComments()]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const isFiltered = Boolean(status || params.q);
  const now = result.now;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="تی‌مگ"
        description="مقاله‌های مجله‌ی مد و استایل. مقاله‌ی «پیش‌نویس» یا دارای تاریخ انتشار آینده در سایت نمایش داده نمی‌شود."
        actions={
          <Link href="/admin/tmag/new" className={adminButton("primary", "md")}>
            <PlusIcon width={18} height={18} />
            مقاله‌ی جدید
          </Link>
        }
      />
      <BlogAdminTabs active="posts" pendingComments={pendingComments} />

      <FilterTabs items={STATUS_TABS.map((tab) => ({ label: tab.label, href: buildHref("/admin/tmag", { status: tab.value || undefined, q: params.q }), active: (status ?? "") === tab.value }))} />
      <FilterBar resetHref="/admin/tmag" isFiltered={isFiltered}>
        {status && <input type="hidden" name="status" value={status} />}
        <SearchField defaultValue={params.q} placeholder="جستجوی عنوان مقاله..." />
      </FilterBar>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<NewspaperIcon width={26} height={26} />}
          title={isFiltered ? "مقاله‌ای مطابق این فیلتر پیدا نشد" : "هنوز مقاله‌ای ثبت نشده است"}
          description={isFiltered ? undefined : "اولین مقاله‌ی تی‌مگ را بنویسید؛ مقاله‌های خوب، ورودی جستجوی گوگل و دستیارهای هوشمند هستند."}
        />
      ) : (
        <TableCard>
          <table className={`${TABLE} min-w-[760px]`}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>عنوان</th>
                <th className={TH}>دسته</th>
                <th className={TH}>وضعیت</th>
                <th className={TH}>انتشار</th>
                <th className={TH}>دیدگاه</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((post) => {
                const scheduled = post.status === "published" && post.publishedAt && post.publishedAt.getTime() > now;
                return (
                  <tr key={post.id} className={TR}>
                    <td className={TD}>
                      <Link href={`/admin/tmag/${post.id}`} className="font-semibold text-ink hover:text-brand">
                        {post.title}
                      </Link>
                      <span className="block text-[0.74rem] text-text-secondary">{post.authorName}</span>
                    </td>
                    <td className={TD_MUTED}>{post.categoryName ?? "—"}</td>
                    <td className={TD}>
                      <StatusBadge tone={scheduled ? "info" : post.status === "published" ? "success" : "neutral"}>{scheduled ? "زمان‌بندی شده" : post.status === "published" ? "منتشر شده" : "پیش‌نویس"}</StatusBadge>
                    </td>
                    <td className={TD_MUTED}>{post.publishedAt ? formatDate(post.publishedAt) : "—"}</td>
                    <td className={TD}>{toPersianDigits(post.commentCount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}

      <Pagination pathname="/admin/tmag" params={{ status, q: params.q }} page={page} totalPages={totalPages} total={result.total} pageSize={result.pageSize} />
    </div>
  );
}
