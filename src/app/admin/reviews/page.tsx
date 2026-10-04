import { listReviewsForAdmin } from "@/domains/reviews/admin-queries";
import { ReviewModerationRow } from "@/components/admin/ReviewModerationRow";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { Review } from "@/lib/db/schema";
import { buildHref, EmptyState, FilterTabs, PageHeader, Pagination } from "@/components/admin/ui/layout";
import { StarIcon } from "@/components/admin/ui/icons";

export const metadata = { title: "دیدگاه‌ها", robots: { index: false, follow: false } };

const STATUS_FILTERS: { value: Review["status"] | ""; label: string }[] = [
  { value: "pending", label: "در انتظار بررسی" },
  { value: "approved", label: "تأیید شده" },
  { value: "rejected", label: "رد شده" },
  { value: "", label: "همه" },
];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = STATUS_FILTERS.some((filter) => filter.value && filter.value === params.status) ? (params.status as Review["status"]) : undefined;
  const page = Number(params.page ?? "1") || 1;
  const reviewPage = await listReviewsForAdmin({ status, page });
  const totalPages = Math.max(1, Math.ceil(reviewPage.total / reviewPage.pageSize));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="دیدگاه‌ها"
        description="دیدگاه مشتریان تا زمانی که تأیید نشود در فروشگاه نمایش داده نمی‌شود. دیدگاه‌های «خرید تأیید شده» را مشتریانی نوشته‌اند که همان محصول را خریده‌اند."
      />

      <FilterTabs
        items={STATUS_FILTERS.map((filter) => ({
          label: filter.label,
          href: buildHref("/admin/reviews", { status: filter.value || undefined }),
          active: (status ?? "") === filter.value,
        }))}
      />

      {reviewPage.rows.length === 0 ? (
        <EmptyState
          icon={<StarIcon width={26} height={26} />}
          title={status === "pending" ? "دیدگاهی در انتظار بررسی نیست" : "دیدگاهی یافت نشد"}
          description={status === "pending" ? "همه دیدگاه‌های ثبت‌شده بررسی شده‌اند." : undefined}
        />
      ) : (
        <>
          <p className="m-0 text-[0.82rem] text-text-secondary">{toPersianDigits(reviewPage.total)} دیدگاه</p>
          <div className="flex flex-col gap-4">
            {reviewPage.rows.map((review) => (
              <ReviewModerationRow key={review.id} review={review} />
            ))}
          </div>
        </>
      )}

      <Pagination pathname="/admin/reviews" params={{ status }} page={page} totalPages={totalPages} total={reviewPage.total} pageSize={reviewPage.pageSize} />
    </div>
  );
}
